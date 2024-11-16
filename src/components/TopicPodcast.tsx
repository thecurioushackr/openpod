import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Play, Download } from "lucide-react";
import { io } from "socket.io-client";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function TopicPodcast() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [topic, setTopic] = useState("");
  const { toast } = useToast();

  const generateTopicPodcast = async () => {
    if (!topic.trim()) {
      toast({
        title: "Missing Topic",
        description: "Please enter a topic you'd like to learn about",
        variant: "destructive",
      });
      return;
    }

    // Get the Gemini API key
    const apiKey = sessionStorage.getItem("google_key");
    if (!apiKey) {
      toast({
        title: "Missing API Key",
        description: "Please set your Google API key first",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setStatusMessage("Connecting to server...");
    setAudioUrl("");
    setTranscript("");

    try {
      const socket = io({
        path: "/socket.io",
        reconnection: true,
        timeout: 10000,
      });

      socket.on("connect", () => {
        console.log("Socket connected successfully");
        setStatusMessage("Connected to server");

        const payload = {
          topics: topic,
          google_key: apiKey,
        };

        socket.emit("generate_news_podcast", payload);
      });

      socket.on("progress", (data: { progress: number; message: string }) => {
        setProgress(data.progress);
        setStatusMessage(data.message);
      });

      socket.on(
        "complete",
        (data: { audioUrl: string; transcript: string }) => {
          console.log("Podcast generation complete:", data);
          setAudioUrl(data.audioUrl);
          setTranscript(data.transcript);
          socket.disconnect();
          setIsGenerating(false);
        }
      );
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate podcast",
        variant: "destructive",
      });
      setIsGenerating(false);
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">Topic Research Podcast</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Enter any topic and we'll research it, synthesize the information,
            and create an engaging podcast discussion about it. Perfect for
            learning about new subjects or getting a comprehensive overview of
            any topic.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="topic">Topic</Label>
          <Input
            id="topic"
            placeholder="e.g., Quantum Computing, Climate Change, History of Jazz"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            Be as specific or broad as you'd like. We'll research and create an
            informative discussion about it.
          </p>
        </div>
      </div>

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
            <Label>Generated Topic Podcast</Label>
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
              <Download className="mr-2 h-4 w-4" />
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

      <Button
        onClick={generateTopicPodcast}
        className="w-full"
        disabled={isGenerating}
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Researching and Generating Podcast
          </>
        ) : (
          <>
            <Play className="mr-2 h-4 w-4" />
            Generate Topic Podcast
          </>
        )}
      </Button>
    </Card>
  );
}
