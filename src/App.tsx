import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomPodcast } from "@/components/CustomPodcast";
import { APIKeys } from "@/components/APIKeys";
import { NewsPodcast } from "@/components/NewsPodcast";
import { Toaster } from "@/components/ui/toaster";

export default function App() {
  const [activeTab, setActiveTab] = useState("custom");

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://buttons.github.io/buttons.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="min-h-screen w-full bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-3">OpenPod</h1>
          <p className="text-lg text-muted-foreground mb-4">
            Transform any content into engaging podcast conversations
          </p>
          <div className="flex flex-column items-center justify-center gap-4 text-sm text-muted-foreground">
            <p className="text-sm text-muted-foreground">
              Powered by{" "}
              <a
                href="https://podcastfy.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                Podcastfy
              </a>
            </p>
            <a
              className="github-button"
              href="https://github.com/giulioco/openpod"
              data-color-scheme="no-preference: light_high_contrast; light: dark; dark: dark;"
              data-size="large"
              data-show-count="true"
              aria-label="Star giulioco/openpod on GitHub"
            >
              Star
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="custom">Custom Podcast</TabsTrigger>
                <TabsTrigger value="news">News Podcast</TabsTrigger>
              </TabsList>
              <TabsContent value="custom">
                <CustomPodcast />
              </TabsContent>
              <TabsContent value="news">
                <NewsPodcast />
              </TabsContent>
            </Tabs>
          </div>

          <div className="lg:col-span-1">
            <APIKeys />
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
