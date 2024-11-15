import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomPodcast } from '@/components/CustomPodcast';
import { APIKeys } from '@/components/APIKeys';
import { NewsPodcast } from '@/components/NewsPodcast';
import { Toaster } from '@/components/ui/toaster';

export default function App() {
  const [activeTab, setActiveTab] = useState('custom');

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-gray-900 mb-8">
          AI Podcast Generator
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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