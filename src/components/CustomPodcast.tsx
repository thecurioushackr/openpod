import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Play, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { io } from "socket.io-client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Switch } from "@/components/ui/switch";

type ConversationStyle =
  | "Engaging"
  | "Fast-paced"
  | "Enthusiastic"
  | "Educational"
  | "Casual"
  | "Professional"
  | "Friendly";
type DialogueStructure =
  | "Topic Introduction"
  | "Summary"
  | "Discussions"
  | "Q&A"
  | "Farewell";
type EngagementTechnique =
  | "Questions"
  | "Testimonials"
  | "Quotes"
  | "Anecdotes"
  | "Analogies"
  | "Humor";
type TTSModel = "geminimulti" | "edge" | "openai" | "elevenlabs";

interface PodcastPayload {
  urls: string[];
  name: string;
  tagline: string;
  is_long_form: boolean;
  creativity: number;
  conversation_style: string[];
  roles_person1: string;
  roles_person2: string;
  dialogue_structure: string[];
  user_instructions?: string;
  engagement_techniques: string[];
  tts_model: TTSModel;
  google_key?: string;
  openai_key?: string;
  elevenlabs_key?: string;
}

const formSchema = z.object({
  urls: z.string(),
  podcastName: z.string(),
  podcastTagline: z.string(),
  instructions: z.string(),
  isLongForm: z.boolean().default(false),
  creativityLevel: z.number().min(0).max(1),
  interviewerRole: z.string(),
  expertRole: z.string(),
  conversationStyles: z.array(z.string()),
  dialogueStructure: z.array(z.string()),
  engagementTechniques: z.array(z.string()),
  ttsModel: z.string(),
});

const extractUrls = (text: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
};

type PodcastFormData = z.infer<typeof formSchema>;

export function CustomPodcast() {
  const [parsedUrls, setParsedUrls] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      urls: "",
      podcastName: "",
      podcastTagline: "",
      instructions: "",
      isLongForm: false,
      creativityLevel: 0.7,
      interviewerRole: "Interviewer",
      expertRole: "Subject matter expert",
      conversationStyles: ["Engaging", "Fast-paced", "Enthusiastic"],
      dialogueStructure: ["Discussions"],
      engagementTechniques: ["Questions"],
      ttsModel: "geminimulti",
    },
  });

  useEffect(() => {
    const savedData = localStorage.getItem("podcast_form");
    const savedUrls = localStorage.getItem("podcast_urls");

    if (savedData) {
      const parsedData = JSON.parse(savedData) as PodcastFormData;
      Object.entries(parsedData).forEach(([key, value]) => {
        form.setValue(key as keyof PodcastFormData, value);
      });
    }

    if (savedUrls) {
      setParsedUrls(JSON.parse(savedUrls));
    }
  }, []);

  useEffect(() => {
    const formData = form.getValues();
    localStorage.setItem("podcast_form", JSON.stringify(formData));
  }, [form.watch()]);

  useEffect(() => {
    localStorage.setItem("podcast_urls", JSON.stringify(parsedUrls));
  }, [parsedUrls]);

  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    const urls = extractUrls(pastedText);

    if (urls.length > 0) {
      setParsedUrls((prev) => [...new Set([...prev, ...urls])]);
      form.setValue("urls", "", { shouldValidate: true });
      toast({
        title: "URLs Extracted",
        description: `Successfully extracted ${urls.length} URLs`,
      });
    }
  };

  const removeUrl = (index: number) => {
    // Prevent event propagation
    event?.preventDefault();
    event?.stopPropagation();

    setParsedUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const getRequiredApiKey = (model: TTSModel) => {
    switch (model) {
      case "geminimulti":
        return { key: sessionStorage.getItem("google_key"), name: "Google" };
      case "openai":
        return { key: sessionStorage.getItem("openai_key"), name: "OpenAI" };
      case "elevenlabs":
        return {
          key: sessionStorage.getItem("elevenlabs_key"),
          name: "ElevenLabs",
        };
      case "edge":
        return null; // No API key required
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      // Validate URLs first
      if (parsedUrls.length === 0) {
        toast({
          title: "No URLs",
          description: "Please add at least one URL to generate the podcast",
          variant: "destructive",
        });
        return;
      }

      setIsGenerating(true);
      setProgress(0);
      setStatusMessage("Connecting to server...");
      setAudioUrl(""); // Clear previous audio
      setTranscript(""); // Clear previous transcript

      // Create socket connection
      const socket = io({
        path: "/socket.io",
        reconnection: true,
        timeout: 10000,
      });

      // Handle cleanup
      const cleanup = () => {
        console.log("Cleaning up socket connection...");
        socket.disconnect();
        setIsGenerating(false);
      };

      // Add event handlers
      socket.on("connect", () => {
        console.log("Socket connected successfully");
        setStatusMessage("Connected to server");

        const payload: PodcastPayload = {
          urls: parsedUrls,
          name: values.podcastName,
          tagline: values.podcastTagline,
          is_long_form: values.isLongForm,
          creativity: values.creativityLevel,
          conversation_style: values.conversationStyles,
          roles_person1: values.interviewerRole,
          roles_person2: values.expertRole,
          dialogue_structure: values.dialogueStructure,
          user_instructions: values.instructions,
          engagement_techniques: values.engagementTechniques,
          tts_model: values.ttsModel as TTSModel,
        };

        // Add API key based on selected model
        const requiredApiKey = getRequiredApiKey(values.ttsModel as TTSModel);
        if (requiredApiKey) {
          switch (values.ttsModel) {
            case "geminimulti":
              payload.google_key = requiredApiKey.key || undefined;
              break;
            case "openai":
              payload.openai_key = requiredApiKey.key || undefined;
              break;
            case "elevenlabs":
              payload.elevenlabs_key = requiredApiKey.key || undefined;
              break;
          }
        }

        socket.emit("generate_podcast", payload);
      });

      socket.on("error", (error: { message: string }) => {
        console.error("Socket error:", error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        cleanup();
      });

      socket.on("disconnect", () => {
        console.log("Socket disconnected");
        cleanup();
      });

      socket.on(
        "complete",
        (data: { audioUrl: string; transcript: string }) => {
          console.log("Podcast generation complete:", data);
          setAudioUrl(data.audioUrl);
          setTranscript(data.transcript);
          cleanup();
        }
      );

      // Handle component unmount
      return () => cleanup();
    } catch (error: any) {
      console.error("Error in onSubmit:", error);
      setIsGenerating(false);
      toast({
        title: "Error",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    }
  };

  const conversationStyles: ConversationStyle[] = [
    "Engaging",
    "Fast-paced",
    "Enthusiastic",
    "Educational",
    "Casual",
    "Professional",
    "Friendly",
  ];
  const dialogueStructures: DialogueStructure[] = [
    "Topic Introduction",
    "Summary",
    "Discussions",
    "Q&A",
    "Farewell",
  ];
  const engagementTechniques: EngagementTechnique[] = [
    "Questions",
    "Testimonials",
    "Quotes",
    "Anecdotes",
    "Analogies",
    "Humor",
  ];

  const clearSavedData = () => {
    localStorage.removeItem("podcast_form");
    localStorage.removeItem("podcast_urls");
    form.reset();
    setParsedUrls([]);
    toast({
      title: "Form Cleared",
      description: "All saved data has been cleared",
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Custom Podcast</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={clearSavedData}
            className="text-muted-foreground"
          >
            Clear Form
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="urls">Enter URLs</Label>
            <Textarea
              id="urls"
              placeholder="Paste content containing URLs - they will be automatically extracted"
              {...form.register("urls")}
              onPaste={onPaste}
              className="min-h-[100px] font-mono text-sm"
            />
          </div>

          {parsedUrls.length > 0 && (
            <div className="space-y-2">
              <Label>Parsed URLs</Label>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {parsedUrls.map((url, index) => {
                  const domain = new URL(url).hostname;
                  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}`;

                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-secondary/50 p-2 rounded text-sm group"
                    >
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <img
                          src={faviconUrl}
                          alt=""
                          className="w-4 h-4 flex-shrink-0"
                          onError={(e) => {
                            // Fallback if favicon fails to load
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                        <span className="truncate font-mono">{url}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeUrl(index)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="podcastName">Podcast Name</Label>
              <Input id="podcastName" {...form.register("podcastName")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="podcastTagline">Podcast Tagline</Label>
              <Input id="podcastTagline" {...form.register("podcastTagline")} />
            </div>

            <Accordion type="single" collapsible>
              <AccordionItem value="instructions">
                <AccordionTrigger>Additional Instructions</AccordionTrigger>
                <AccordionContent>
                  <Textarea
                    id="instructions"
                    {...form.register("instructions")}
                    placeholder="Add any specific instructions for the podcast generation..."
                    className="min-h-[100px]"
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <Accordion type="single" collapsible className="w-full mt-4">
            <AccordionItem value="advanced">
              <AccordionTrigger>Advanced Settings</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="isLongForm">Long-form Content</Label>
                      <Switch
                        id="isLongForm"
                        checked={form.watch("isLongForm")}
                        onCheckedChange={(checked: boolean) =>
                          form.setValue("isLongForm", checked)
                        }
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Enable for longer, more detailed podcast content
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Creativity Level ({form.watch("creativityLevel")})
                    </Label>
                    <Slider
                      value={[form.watch("creativityLevel")]}
                      onValueChange={([value]) =>
                        form.setValue("creativityLevel", value)
                      }
                      max={1}
                      step={0.1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>Interviewer Role</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <InfoCircledIcon className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">
                              Define the role of the first speaker (e.g., Host,
                              Moderator, Journalist)
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input {...form.register("interviewerRole")} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>Expert Role</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <InfoCircledIcon className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">
                              Define the role of the second speaker (e.g., Guest
                              Expert, Specialist, Researcher)
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input {...form.register("expertRole")} />
                  </div>

                  <div className="space-y-2">
                    <Label>Conversation Style</Label>
                    <div className="flex flex-wrap gap-2">
                      {conversationStyles.map((style) => (
                        <Badge
                          key={style}
                          variant={
                            form.watch("conversationStyles").includes(style)
                              ? "default"
                              : "outline"
                          }
                          className="cursor-pointer"
                          onClick={() => {
                            const current = form.watch("conversationStyles");
                            if (current.includes(style)) {
                              form.setValue(
                                "conversationStyles",
                                current.filter((s) => s !== style)
                              );
                            } else {
                              form.setValue("conversationStyles", [
                                ...current,
                                style,
                              ]);
                            }
                          }}
                        >
                          {style}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Dialogue Structure</Label>
                    <div className="flex flex-wrap gap-2">
                      {dialogueStructures.map((structure) => (
                        <Badge
                          key={structure}
                          variant={
                            form.watch("dialogueStructure").includes(structure)
                              ? "default"
                              : "outline"
                          }
                          className="cursor-pointer"
                          onClick={() => {
                            const current = form.watch("dialogueStructure");
                            if (current.includes(structure)) {
                              form.setValue(
                                "dialogueStructure",
                                current.filter((s) => s !== structure)
                              );
                            } else {
                              form.setValue("dialogueStructure", [
                                ...current,
                                structure,
                              ]);
                            }
                          }}
                        >
                          {structure}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Engagement Techniques</Label>
                    <div className="flex flex-wrap gap-2">
                      {engagementTechniques.map((technique) => (
                        <Badge
                          key={technique}
                          variant={
                            form
                              .watch("engagementTechniques")
                              .includes(technique)
                              ? "default"
                              : "outline"
                          }
                          className="cursor-pointer"
                          onClick={() => {
                            const current = form.watch("engagementTechniques");
                            if (current.includes(technique)) {
                              form.setValue(
                                "engagementTechniques",
                                current.filter((t) => t !== technique)
                              );
                            } else {
                              form.setValue("engagementTechniques", [
                                ...current,
                                technique,
                              ]);
                            }
                          }}
                        >
                          {technique}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>Text-to-Speech Model</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <InfoCircledIcon className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm">
                            <div className="space-y-2">
                              <p className="font-semibold">
                                API Key Setup Instructions:
                              </p>
                              <p>
                                <strong>Google Gemini:</strong>
                              </p>
                              <ol className="list-decimal pl-4 space-y-1">
                                <li>Go to Google Cloud Console</li>
                                <li>
                                  Enable both "Vertex AI API" and "Cloud
                                  Text-to-Speech API"
                                </li>
                                <li>
                                  Create an API key with access to these APIs
                                </li>
                                <li>
                                  Add Cloud Text-to-Speech API permission to the
                                  key
                                </li>
                              </ol>
                              <p>
                                <strong>OpenAI:</strong> Get your API key from
                                OpenAI dashboard
                              </p>
                              <p>
                                <strong>ElevenLabs:</strong> Get your API key
                                from ElevenLabs dashboard
                              </p>
                              <p>
                                <strong>Edge TTS:</strong> No API key required -
                                free to use
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Select
                      value={form.watch("ttsModel")}
                      onValueChange={(value: TTSModel) =>
                        form.setValue("ttsModel", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select TTS model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="geminimulti">
                          Google Gemini Multi (requires API key)
                        </SelectItem>
                        <SelectItem value="edge">
                          Microsoft Edge TTS (Free)
                        </SelectItem>
                        <SelectItem value="openai">
                          OpenAI TTS (requires API key)
                        </SelectItem>
                        <SelectItem value="elevenlabs">
                          ElevenLabs (requires API key)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {form.watch("ttsModel") !== "edge" && (
                      <p className="text-sm text-muted-foreground">
                        API key required. Click the info icon above for setup
                        instructions.
                      </p>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {isGenerating && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-center text-muted-foreground">
                {statusMessage || `Generating podcast... ${progress}%`}
              </p>
            </div>
          )}

          {audioUrl && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Generated Podcast</Label>
                <audio controls className="w-full">
                  <source src={audioUrl} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
              </div>

              <div className="flex space-x-2">
                <Button
                  className="flex-1"
                  onClick={() => window.open(audioUrl)}
                  variant="secondary"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>

              {transcript && (
                <Accordion type="single" collapsible>
                  <AccordionItem value="transcript">
                    <AccordionTrigger>View Transcript</AccordionTrigger>
                    <AccordionContent>
                      <div className="bg-secondary/50 p-4 rounded-md">
                        <pre className="whitespace-pre-wrap text-sm">
                          {transcript}
                        </pre>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Podcast
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Generate Podcast
              </>
            )}
          </Button>
        </div>
      </Card>
    </form>
  );
}
