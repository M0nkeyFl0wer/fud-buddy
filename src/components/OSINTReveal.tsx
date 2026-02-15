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
  Instagram,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Fingerprint,
  Cpu,
  Wifi,
  EyeOff,
  User
} from 'lucide-react';
import { TrackerDemo } from '@/components/TrackerDemo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { clearUserProfile, consumeOsintExpandOnce, loadUserProfile } from '@/services/profile';

type NavigatorWithDeviceMemory = Navigator & { deviceMemory?: number };

interface OSINTData {
  deviceType: string;
  os: string;
  browser: string;
  screen: string;
  cores: string;
  memory: string;
  touchSupport: string;
  timezone: string;
  language: string;
  doNotTrack: string;
  cookiesEnabled: string;
  trackersFound: number;
  cookiesStored: number;
  localStorageUsed: boolean;
  canvasFingerprint: string;
  fbCookies: number;
  igCookies: number;
  fbPixelFired: boolean;
  probableIdentity: string;
}

export function OSINTReveal() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [data, setData] = useState<OSINTData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileVersion, setProfileVersion] = useState(0);

  const profile = loadUserProfile();

  useEffect(() => {
    const collectFingerprint = async () => {
      const ua = navigator.userAgent;
      
      let deviceType = 'Desktop';
      if (/mobile/i.test(ua)) deviceType = 'Mobile';
      if (/tablet/i.test(ua)) deviceType = 'Tablet';
      
      let os = 'Unknown OS';
      if (/windows/i.test(ua)) os = 'Windows';
      else if (/mac/i.test(ua)) os = 'macOS';
      else if (/linux/i.test(ua)) os = 'Linux';
      else if (/android/i.test(ua)) os = 'Android';
      else if (/ios|iphone|ipad/i.test(ua)) os = 'iOS';
      
      let browser = 'Unknown';
      if (/chrome/i.test(ua) && !/edg/i.test(ua)) browser = 'Chrome';
      else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
      else if (/firefox/i.test(ua)) browser = 'Firefox';
      else if (/edg/i.test(ua)) browser = 'Edge';
      
      const screenDesc = `${window.screen.width}x${window.screen.height}`;
      const cores = navigator.hardwareConcurrency || 'Unknown';
      const memoryGb = (navigator as NavigatorWithDeviceMemory).deviceMemory;
      const memory = typeof memoryGb === 'number' ? `~${memoryGb}GB` : 'Unknown';
      const touchSupport = navigator.maxTouchPoints > 0 ? `Yes` : 'No';
      
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const language = navigator.language;
      const doNotTrack = navigator.doNotTrack === '1' ? 'Enabled' : 'Disabled';
      const cookiesEnabled = navigator.cookieEnabled ? 'Yes' : 'No';
      
      let cookiesStored = 0;
      try {
        cookiesStored = document.cookie.split(';').length;
      } catch {
        /* ignore */
      }
      
      let localStorageUsed = false;
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        localStorageUsed = true;
      } catch {
        /* ignore */
      }
      
      // Check for FB/IG cookies and pixel
      let fbCookies = 0;
      let igCookies = 0;
      let fbPixelFired = false;
      try {
        const allCookies = document.cookie;
        fbCookies = (allCookies.match(/fb|c_user|xs|plaid/g) || []).length;
        igCookies = (allCookies.match(/ig|instagram|ds_user_id/g) || []).length;
        const fbqExists = typeof window.fbq === 'function';
        fbPixelFired = fbqExists;
      } catch {
        /* ignore */
      }
      
      // Canvas fingerprint
      let canvasFingerprint = 'N/A';
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context unavailable');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('FUD', 2, 15);
        canvasFingerprint = btoa(canvas.toDataURL().slice(0, 50)).slice(0, 20);
      } catch {
        /* ignore */
      }
      
      // Trackers
      const trackersFound = document.scripts.length;
      
      // Fingerprint-based identity estimate
      const probableIdentity = `${browser}-${os}-${screenDesc.slice(0, 8)}-${timezone.slice(0, 3)}`;
      
      setData({
        deviceType,
        os,
        browser,
        screen: screenDesc,
        cores: String(cores),
        memory,
        touchSupport,
        timezone,
        language,
        doNotTrack,
        cookiesEnabled,
        trackersFound,
        cookiesStored,
        localStorageUsed,
        canvasFingerprint,
        fbCookies,
        igCookies,
        fbPixelFired,
        probableIdentity,
      });
      
      setIsLoading(false);
    };

    setTimeout(collectFingerprint, 500);
  }, []);

  useEffect(() => {
    if (consumeOsintExpandOnce()) {
      setIsExpanded(true);
    }
  }, [profileVersion]);

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
              See what FUD Buddy found about you
            </span>
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </Button>

          {isExpanded && (
            <Card className="mx-4 mb-4 border-destructive/50 max-h-80 overflow-y-auto">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  Your Digital Fingerprint
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                {/* Device */}
                <div>
                  <p className="font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                    <Smartphone className="w-3 h-3" /> Device
                  </p>
                  <div className="grid grid-cols-2 gap-1 pl-4 text-[10px]">
                    <span className="text-muted-foreground">Type:</span><span>{data?.deviceType}</span>
                    <span className="text-muted-foreground">OS:</span><span>{data?.os}</span>
                    <span className="text-muted-foreground">Browser:</span><span>{data?.browser}</span>
                    <span className="text-muted-foreground">Screen:</span><span>{data?.screen}</span>
                  </div>
                </div>

                {/* Tracking */}
                <div className="border-t pt-2">
                  <p className="font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                    <EyeOff className="w-3 h-3" /> Trackers & Profiles
                  </p>
                  <div className="bg-destructive/10 p-2 rounded space-y-1">
                    <div className="flex items-center gap-2">
                      <Facebook className="w-3 h-3" />
                      <span>Facebook pixel:</span>
                      <span className={data?.fbPixelFired ? "text-destructive font-bold" : "text-muted-foreground"}>
                        {data?.fbPixelFired ? "FIRED - Facebook knows you visited" : "Not detected"}
                      </span>
                    </div>
                    <p className="text-[9px] text-muted-foreground pl-5">
                      Pixel sent your IP, browser fingerprint & cookie to Facebook. 
                      They match it to your profile and share with advertisers.
                    </p>
                    <div className="flex items-center gap-2">
                      <Instagram className="w-3 h-3" />
                      <span>Instagram:</span>
                      <span className={data?.igCookies && data.igCookies > 0 ? "text-destructive font-bold" : "text-muted-foreground"}>
                        {data?.igCookies && data.igCookies > 0 ? "Cookies detected" : "Not detected"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Fingerprint className="w-3 h-3" />
                      <span>Browser fingerprint:</span>
                      <span className="font-mono text-destructive">{data?.canvasFingerprint}</span>
                    </div>
                  </div>
                </div>

                {/* Fingerprint Profile */}
                <div className="border-t pt-2">
                  <p className="font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                    <User className="w-3 h-3" /> Your Browser Profile
                  </p>
                  <div className="bg-muted p-2 rounded font-mono text-[9px] break-all">
                    {data?.probableIdentity}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    This profile can be used to track you across websites even without cookies.
                  </p>
                </div>

                {profile?.consentShowInOsint && (profile.displayName || profile.avatarUrl) && (
                  <div className="border-t pt-2">
                    <p className="font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                      <User className="w-3 h-3" /> With your permission
                    </p>
                    <div className="flex items-center gap-3 bg-muted p-2 rounded">
                      <Avatar className="h-9 w-9">
                        {profile.avatarUrl ? <AvatarImage src={profile.avatarUrl} alt="" /> : null}
                        <AvatarFallback>
                          {(profile.displayName || 'You')
                            .split(/\s+/)
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((p) => p[0])
                            .join('')
                            .toUpperCase() || 'YOU'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="text-[11px] font-medium truncate">
                          {profile.displayName || 'You'}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          Saved locally{profile.provider && profile.provider !== 'none' ? ` · ${profile.provider}` : ''}
                        </div>
                      </div>
                      <div className="ml-auto">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[10px]"
                          onClick={() => {
                            clearUserProfile();
                            setProfileVersion((v) => v + 1);
                          }}
                        >
                          Forget me
                        </Button>
                      </div>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-2">
                      This section only appears when you opt in (Share + Save).
                    </p>
                  </div>
                )}

                {/* Why it matters */}
                <div className="border-t pt-2 text-[10px] text-muted-foreground">
                  <p className="font-medium flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    The Reality
                  </p>
                  <p className="mt-1">
                    Sites can collect a lot (device + network signals) without asking. Some of that data
                    is enough to make you consistently re-identifiable across sites. We can't read your
                    Facebook or Instagram ID here, but ad platforms can link visits to accounts inside
                    their systems.
                  </p>
                </div>

                {/* Opt-in demo */}
                <div className="border-t pt-2">
                  <p className="font-semibold text-muted-foreground mb-1">
                    Try it with Privacy Badger
                  </p>
                  <TrackerDemo />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
