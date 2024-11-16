import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export function NewsPodcast() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const generateNewsPodcast = async () => {
    setIsGenerating(true);
    setProgress(0);

    try {
      // Implementation for news podcast generation
      toast({
        title: "Coming Soon",
        description: "News podcast generation is coming soon!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate news podcast",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="topics">Topics of Interest</Label>
        <Input id="topics" placeholder="e.g., Technology, Business, Science" />
      </div>

      {isGenerating && (
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-center text-gray-500">
            Generating news podcast... {progress}%
          </p>
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
          "Generate News Podcast"
        )}
      </Button>
    </div>
  );
}
