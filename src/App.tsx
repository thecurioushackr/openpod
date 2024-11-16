import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomPodcast } from "@/components/CustomPodcast";
import { APIKeys } from "@/components/APIKeys";
import { NewsPodcast } from "@/components/NewsPodcast";
import { Toaster } from "@/components/ui/toaster";

export default function App() {
  const [activeTab, setActiveTab] = useState("custom");

  return (
    <div className="min-h-screen w-full bg-background">
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-4xl font-bold text-center mb-8">
          AI Podcast Generator
        </h1>

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
