import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export function APIKeys() {
  const [keys, setKeys] = useState({
    gemini: "",
    openai: "",
    elevenlabs: "",
  });
  const { toast } = useToast();

  const saveKey = (type: keyof typeof keys) => {
    // In a real app, you'd send this to your backend
    localStorage.setItem(`${type}_key`, keys[type]);
    toast({
      title: "API Key Saved",
      description: `Your ${type} API key has been saved successfully.`,
    });
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-6">API Keys</h2>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="gemini">Google (Gemini) API Key</Label>
          <div className="flex space-x-2">
            <Input
              id="gemini"
              type="password"
              value={keys.gemini}
              onChange={(e) =>
                setKeys((prev) => ({ ...prev, gemini: e.target.value }))
              }
            />
            <Button onClick={() => saveKey("gemini")}>Save</Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="openai">OpenAI API Key</Label>
          <div className="flex space-x-2">
            <Input
              id="openai"
              type="password"
              value={keys.openai}
              onChange={(e) =>
                setKeys((prev) => ({ ...prev, openai: e.target.value }))
              }
            />
            <Button onClick={() => saveKey("openai")}>Save</Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="elevenlabs">ElevenLabs API Key</Label>
          <div className="flex space-x-2">
            <Input
              id="elevenlabs"
              type="password"
              value={keys.elevenlabs}
              onChange={(e) =>
                setKeys((prev) => ({ ...prev, elevenlabs: e.target.value }))
              }
            />
            <Button onClick={() => saveKey("elevenlabs")}>Save</Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
