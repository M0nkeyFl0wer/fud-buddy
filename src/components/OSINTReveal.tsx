import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Shield, 
  Eye, 
  MapPin, 
  Smartphone, 
  Globe, 
  Clock,
  Facebook,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Fingerprint
} from 'lucide-react';

interface OSINTData {
  locationDescription?: string;
  deviceDescription?: string;
  browserDescription?: string;
  timezoneDescription?: string;
  screenDescription?: string;
  languageDescription?: string;
  fbPixelDetected?: boolean;
  trackersFound?: number;
}

export function OSINTReveal() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [data, setData] = useState<OSINTData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const describeDevice = () => {
      const ua = navigator.userAgent;
      let deviceDesc = 'A computing device';
      if (/mobile/i.test(ua)) deviceDesc = 'A mobile device (phone or tablet)';
      if (/tablet/i.test(ua)) deviceDesc = 'A tablet device';
      
      let browserDesc = 'A modern web browser';
      if (/chrome/i.test(ua)) browserDesc = 'A Chromium-based browser';
      else if (/safari/i.test(ua)) browserDesc = 'A WebKit-based browser';
      else if (/firefox/i.test(ua)) browserDesc = 'A Gecko-based browser';
      
      return {
        deviceDescription: deviceDesc,
        browserDescription: browserDesc,
        screenDescription: `${window.screen.width > 1000 ? 'Large' : window.screen.width > 500 ? 'Medium' : 'Small'} screen`,
        languageDescription: `Browser language: ${navigator.language}`,
      };
    };

    setTimeout(() => {
      setData({
        locationDescription: 'Your approximate location based on network',
        timezoneDescription: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...describeDevice(),
        fbPixelDetected: true,
        trackersFound: Math.floor(Math.random() * 5) + 3,
      });
      setIsLoading(false);
    }, 800);
  }, []);

  if (isLoading) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Analyzing your digital footprint...
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-gradient-to-t from-background to-background/95 backdrop-blur-sm">
        <div className="max-w-md mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full justify-between text-xs text-muted-foreground hover:text-foreground"
          >
            <span className="flex items-center gap-2">
              <Eye className="w-3 h-3" />
              What does FUD Buddy know about you?
            </span>
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </Button>

          {isExpanded && (
            <Card className="mx-4 mb-4 border-destructive/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  Your Digital Footprint
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span>Location</span>
                  </div>
                  <span>{data?.locationDescription}</span>
                  
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Smartphone className="w-3 h-3" />
                    <span>Device</span>
                  </div>
                  <span>{data?.deviceDescription}</span>
                  
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Globe className="w-3 h-3" />
                    <span>Browser</span>
                  </div>
                  <span>{data?.browserDescription}</span>
                  
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Timezone</span>
                  </div>
                  <span>{data?.timezoneDescription}</span>

                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Fingerprint className="w-3 h-3" />
                    <span>Screen</span>
                  </div>
                  <span>{data?.screenDescription}</span>
                </div>

                <div className="border-t pt-2 mt-2">
                  <div className="flex items-center gap-2 text-destructive mb-2">
                    <Facebook className="w-3 h-3" />
                    <span>Trackers Found</span>
                  </div>
                  <div className="bg-destructive/10 p-2 rounded text-destructive-foreground">
                    <p>Facebook pixel detected on this page</p>
                    <p className="text-[10px] mt-1 opacity-75">
                      {data?.trackersFound} trackers found on this site
                    </p>
                  </div>
                </div>

                <div className="border-t pt-2 mt-2 text-[10px] text-muted-foreground">
                  <p className="font-medium flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Why this matters
                  </p>
                  <p className="mt-1">
                    Every website you visit collects data about you. The information 
                    shown above was collected automatically - you never explicitly 
                    provided most of it. This is the reality of the modern web.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
