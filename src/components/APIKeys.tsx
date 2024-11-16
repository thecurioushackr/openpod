import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, HelpCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const API_KEY_INSTRUCTIONS = {
  google: {
    title: "Get Google API Key",
    steps: [
      {
        title: "Create Google Cloud Project",
        steps: [
          "Go to Google Cloud Console (console.cloud.google.com)",
          "Create a new project or select an existing one",
          "Enable billing for your project",
        ],
      },
      {
        title: "Enable Required APIs",
        steps: [
          "Go to 'APIs & Services' > 'Library'",
          "Search for and enable 'Vertex AI API'",
          "Search for and enable 'Cloud Text-to-Speech API'",
          "Search for and enable 'Gemini API'",
        ],
      },
      {
        title: "Create API Key",
        steps: [
          "Go to 'APIs & Services' > 'Credentials'",
          "Click 'Create Credentials' > 'API Key'",
          "Copy your new API key",
          "Optional: Restrict the key to only the APIs you enabled",
        ],
      },
    ],
  },
  openai: {
    title: "Get OpenAI API Key",
    steps: [
      {
        title: "Create OpenAI Account",
        steps: [
          "Go to platform.openai.com",
          "Sign up or log in to your account",
        ],
      },
      {
        title: "Generate API Key",
        steps: [
          "Go to 'API Keys' section",
          "Click 'Create new secret key'",
          "Give your key a name (optional)",
          "Copy your API key immediately (you won't be able to see it again)",
        ],
      },
    ],
  },
  elevenlabs: {
    title: "Get ElevenLabs API Key",
    steps: [
      {
        title: "Create ElevenLabs Account",
        steps: ["Go to elevenlabs.io", "Sign up or log in to your account"],
      },
      {
        title: "Get API Key",
        steps: [
          "Go to your Profile Settings",
          "Find the 'API Key' section",
          "Copy your API key",
        ],
      },
    ],
  },
};

function InstructionsDialog({
  type,
  instructions,
}: {
  type: string;
  instructions: (typeof API_KEY_INSTRUCTIONS)[keyof typeof API_KEY_INSTRUCTIONS];
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{instructions.title}</DialogTitle>
          <DialogDescription>
            Follow these steps to get your API key
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {instructions.steps.map((section, idx) => (
            <div key={idx} className="space-y-2">
              <h3 className="font-medium">{section.title}</h3>
              <ol className="list-decimal pl-5 space-y-1">
                {section.steps.map((step, stepIdx) => (
                  <li key={stepIdx} className="text-sm text-muted-foreground">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function APIKeys() {
  const [keys, setKeys] = useState({
    google: "",
    openai: "",
    elevenlabs: "",
  });
  const [showKeys, setShowKeys] = useState({
    google: false,
    openai: false,
    elevenlabs: false,
  });
  const { toast } = useToast();

  // Load saved keys on component mount
  useEffect(() => {
    const loadedKeys = {
      google: sessionStorage.getItem("google_key") || "",
      openai: sessionStorage.getItem("openai_key") || "",
      elevenlabs: sessionStorage.getItem("elevenlabs_key") || "",
    };
    setKeys(loadedKeys);
  }, []);

  const saveKey = (type: keyof typeof keys) => {
    if (!keys[type].trim()) {
      toast({
        title: "Error",
        description: "Please enter an API key",
        variant: "destructive",
      });
      return;
    }

    sessionStorage.setItem(`${type}_key`, keys[type]);
    toast({
      title: "API Key Saved",
      description: `Your ${type} API key has been saved for this session.`,
    });
  };

  const toggleShowKey = (type: keyof typeof keys) => {
    setShowKeys((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-6">API Keys</h2>

      <div className="space-y-6">
        {Object.entries(keys).map(([type, value]) => (
          <div key={type} className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor={type} className="capitalize">
                {type === "google"
                  ? "Google"
                  : type === "openai"
                  ? "OpenAI"
                  : "ElevenLabs"}{" "}
                API Key
              </Label>
              <InstructionsDialog
                type={type}
                instructions={
                  API_KEY_INSTRUCTIONS[
                    type as keyof typeof API_KEY_INSTRUCTIONS
                  ]
                }
              />
            </div>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Input
                  id={type}
                  type={
                    showKeys[type as keyof typeof keys] ? "text" : "password"
                  }
                  value={value}
                  onChange={(e) =>
                    setKeys((prev) => ({ ...prev, [type]: e.target.value }))
                  }
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => toggleShowKey(type as keyof typeof keys)}
                >
                  {showKeys[type as keyof typeof keys] ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <Button onClick={() => saveKey(type as keyof typeof keys)}>
                Save
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
