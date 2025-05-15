
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { analyticsService } from '@/services/analyticsService';
import { aiService } from '@/services/aiService';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const Config: React.FC = () => {
  // AI Configuration
  const [aiApiKey, setAiApiKey] = useState<string>('');
  const [aiModel, setAiModel] = useState<string>('gpt-3.5-turbo');
  
  // Analytics Configuration
  const [googleAnalyticsId, setGoogleAnalyticsId] = useState<string>('');
  const [facebookPixelId, setFacebookPixelId] = useState<string>('');

  // Save AI configuration
  const handleSaveAIConfig = () => {
    try {
      // In a real app, this would likely be saved to localStorage or a backend
      aiService.setApiKey(aiApiKey);
      
      localStorage.setItem('fud_ai_key', aiApiKey);
      localStorage.setItem('fud_ai_model', aiModel);
      
      toast({
        title: "AI Configuration Saved",
        description: "Your AI settings have been updated successfully."
      });
    } catch (error) {
      console.error('Error saving AI config:', error);
      toast({
        title: "Error",
        description: "Failed to save AI configuration.",
        variant: "destructive"
      });
    }
  };

  // Save Analytics configuration
  const handleSaveAnalyticsConfig = () => {
    try {
      // Initialize Google Analytics
      if (googleAnalyticsId) {
        analyticsService.initializeGoogleAnalytics(googleAnalyticsId);
        localStorage.setItem('fud_ga_id', googleAnalyticsId);
      }
      
      // Initialize Facebook Pixel
      if (facebookPixelId) {
        analyticsService.initializeFacebookPixel(facebookPixelId);
        localStorage.setItem('fud_fb_id', facebookPixelId);
      }
      
      toast({
        title: "Analytics Configuration Saved",
        description: "Your analytics settings have been updated successfully."
      });
    } catch (error) {
      console.error('Error saving analytics config:', error);
      toast({
        title: "Error",
        description: "Failed to save analytics configuration.",
        variant: "destructive"
      });
    }
  };
  
  // Load saved configurations
  useEffect(() => {
    // Load AI config
    const savedAiKey = localStorage.getItem('fud_ai_key');
    const savedAiModel = localStorage.getItem('fud_ai_model');
    
    if (savedAiKey) setAiApiKey(savedAiKey);
    if (savedAiModel) setAiModel(savedAiModel);
    
    // Load Analytics config
    const savedGaId = localStorage.getItem('fud_ga_id');
    const savedFbId = localStorage.getItem('fud_fb_id');
    
    if (savedGaId) setGoogleAnalyticsId(savedGaId);
    if (savedFbId) setFacebookPixelId(savedFbId);
    
    // Track page view
    analyticsService.trackPageView('/config', 'FUD Buddy - Configuration');
  }, []);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center mb-8">
        <Link to="/" className="mr-3">
          <Button variant="ghost" size="icon">
            <ArrowLeft />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Configuration</h1>
      </div>
      
      <Tabs defaultValue="ai">
        <TabsList className="mb-4">
          <TabsTrigger value="ai">AI Integration</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle>AI Configuration</CardTitle>
              <CardDescription>
                Configure your AI provider settings. Currently supports OpenAI.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="aiApiKey">API Key</Label>
                <Input 
                  id="aiApiKey"
                  type="password"
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  placeholder="Enter your OpenAI API key"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aiModel">Model</Label>
                <select
                  id="aiModel"
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  <option value="gpt-4">GPT-4</option>
                </select>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveAIConfig}>Save AI Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Configuration</CardTitle>
              <CardDescription>
                Configure your analytics tracking IDs for Google Analytics and Facebook Pixel.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="googleAnalyticsId">Google Analytics ID</Label>
                <Input 
                  id="googleAnalyticsId"
                  value={googleAnalyticsId}
                  onChange={(e) => setGoogleAnalyticsId(e.target.value)}
                  placeholder="Enter your Google Analytics ID (G-XXXXXXX)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facebookPixelId">Facebook Pixel ID</Label>
                <Input 
                  id="facebookPixelId"
                  value={facebookPixelId}
                  onChange={(e) => setFacebookPixelId(e.target.value)}
                  placeholder="Enter your Facebook Pixel ID"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveAnalyticsConfig}>Save Analytics Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Config;
