import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, X, Upload, Play, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { io } from 'socket.io-client';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const formSchema = z.object({
  urls: z.string().min(1, 'Please enter at least one URL'),
  podcastName: z.string().min(1, 'Podcast name is required'),
  podcastTagline: z.string().min(1, 'Podcast tagline is required'),
  instructions: z.string().optional(),
});

export function CustomPodcast() {
  const [parsedUrls, setParsedUrls] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      urls: '',
      podcastName: '',
      podcastTagline: '',
      instructions: '',
    },
  });

  const onParseUrls = () => {
    const urls = form.getValues('urls')
      .split(/[\n,]/)
      .map(url => url.trim())
      .filter(url => url.length > 0 && url.startsWith('http'));

    if (urls.length === 0) {
      toast({
        title: 'Invalid URLs',
        description: 'Please enter valid URLs starting with http:// or https://',
        variant: 'destructive',
      });
      return;
    }

    setParsedUrls(urls);
    toast({
      title: 'URLs Parsed',
      description: `Successfully parsed ${urls.length} URLs`,
    });
  };

  const removeUrl = (index: number) => {
    setParsedUrls(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (parsedUrls.length === 0) {
      toast({
        title: 'Error',
        description: 'Please parse some URLs first',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setStatusMessage('');
    setAudioUrl('');
    setTranscript('');

    const socket = io('http://localhost:5000');

    socket.on('progress', (data: { progress: number }) => {
      setProgress(data.progress);
    });

    socket.on('status', (data: { message: string }) => {
      setStatusMessage(data.message);
    });

    socket.on('complete', (data: { audioUrl: string; transcript: string }) => {
      setIsGenerating(false);
      setAudioUrl(data.audioUrl);
      setTranscript(data.transcript);
      toast({
        title: 'Podcast Generated!',
        description: 'Your podcast is ready to play and download',
      });
    });

    socket.on('error', (error) => {
      setIsGenerating(false);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    });

    socket.emit('generate_podcast', {
      urls: parsedUrls,
      name: values.podcastName,
      tagline: values.podcastTagline,
      instructions: values.instructions,
    });
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="urls">Enter URLs</Label>
            <Textarea
              id="urls"
              placeholder="Paste one or multiple URLs (each URL on a new line or separated by commas)"
              {...form.register('urls')}
              className="min-h-[100px] font-mono text-sm"
            />
            <Button 
              onClick={onParseUrls} 
              className="w-full"
              variant="secondary"
            >
              <Upload className="w-4 h-4 mr-2" />
              Parse URLs
            </Button>
          </div>

          {parsedUrls.length > 0 && (
            <div className="space-y-2">
              <Label>Parsed URLs</Label>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {parsedUrls.map((url, index) => (
                  <div key={index} className="flex items-center justify-between bg-secondary/50 p-2 rounded text-sm">
                    <span className="truncate flex-1 mr-2 font-mono">{url}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeUrl(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="podcastName">Podcast Name</Label>
              <Input
                id="podcastName"
                {...form.register('podcastName')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="podcastTagline">Podcast Tagline</Label>
              <Input
                id="podcastTagline"
                {...form.register('podcastTagline')}
              />
            </div>

            <Accordion type="single" collapsible>
              <AccordionItem value="instructions">
                <AccordionTrigger>Additional Instructions</AccordionTrigger>
                <AccordionContent>
                  <Textarea
                    id="instructions"
                    {...form.register('instructions')}
                    placeholder="Add any specific instructions for the podcast generation..."
                    className="min-h-[100px]"
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
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

          <Button
            onClick={form.handleSubmit(onSubmit)}
            className="w-full"
            disabled={isGenerating}
          >
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
    </div>
  );
}