import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Play } from "lucide-react";
import { io } from "socket.io-client";

export function NewsPodcast() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [topics, setTopics] = useState("");
  const { toast } = useToast();

  const generateNewsPodcast = async () => {
    if (!topics.trim()) {
      toast({
        title: "Missing Topics",
        description: "Please enter topics of interest",
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
          topics: topics,
          google_key: apiKey,
        };

        socket.emit("generate_news_podcast", payload);
      });

      socket.on("progress", (data: { progress: number; message: string }) => {
        setProgress(data.progress);
        setStatusMessage(data.message);
      });

      socket.on("status", (message: string) => {
        setStatusMessage(message);
      });

      socket.on("error", (error: { message: string }) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        socket.disconnect();
        setIsGenerating(false);
      });

      socket.on(
        "complete",
        (data: { audioUrl: string; transcript: string }) => {
          setAudioUrl(data.audioUrl);
          setTranscript(data.transcript);
          socket.disconnect();
          setIsGenerating(false);
        }
      );
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate news podcast",
        variant: "destructive",
      });
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="topics">Topics of Interest</Label>
        <Input
          id="topics"
          placeholder="e.g., Technology, Business, Science"
          value={topics}
          onChange={(e) => setTopics(e.target.value)}
        />
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
        <div className="space-y-2">
          <Label>Generated News Podcast</Label>
          <audio controls className="w-full">
            <source src={audioUrl} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        </div>
      )}

      <Button
        onClick={generateNewsPodcast}
        className="w-full"
        disabled={isGenerating}
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating News Podcast
          </>
        ) : (
          <>
            <Play className="mr-2 h-4 w-4" />
            Generate News Podcast
          </>
        )}
      </Button>
    </div>
  );
}
