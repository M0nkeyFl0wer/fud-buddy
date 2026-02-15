import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { VibePicker } from './VibePicker';
import { MapPin, Loader2, Sparkles } from 'lucide-react';
import { apiClient, type UserPreferences } from '@/services/api';
import { ONBOARDING_MESSAGES } from '@/services/messages';
import RobotLogo from '@/components/RobotLogo';
import { DietaryRestrictionsDropdown } from './DietaryRestrictionsDropdown';

interface PreferenceSelectorProps {
  onSubmit: (preferences: UserPreferences) => void;
  isLoading?: boolean;
}

export function PreferenceSelector({ onSubmit, isLoading }: PreferenceSelectorProps) {
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [location, setLocation] = useState('');
  const [vibe, setVibe] = useState<string[]>([]);
  const [dietary, setDietary] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setMessage(ONBOARDING_MESSAGES[Math.floor(Math.random() * ONBOARDING_MESSAGES.length)]);
  }, []);

  const reverseGeocode = useCallback(async (lat: number, lon: number): Promise<string> => {
    // Prefer backend reverse geocode (avoids browser CORS issues and sets a real User-Agent).
    try {
      const resp = await apiClient.get<{ ok?: boolean; display?: string }>(
        `/api/geocode/reverse?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`
      );
      if (resp?.ok && typeof resp.display === 'string' && resp.display) {
        return resp.display;
      }
    } catch {
      // Fall back to client-side Nominatim.
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 4500);
    try {
      const url = new URL('https://nominatim.openstreetmap.org/reverse');
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('lat', String(lat));
      url.searchParams.set('lon', String(lon));

      const resp = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'en',
        },
      });
      if (!resp.ok) return '';
      const data: unknown = await resp.json();
      if (!data || typeof data !== 'object') return '';

      const addr = (data as Record<string, unknown>).address;
      const displayName = (data as Record<string, unknown>).display_name;
      if (addr && typeof addr === 'object') {
        const a = addr as Record<string, unknown>;
        const city =
          (typeof a.city === 'string' && a.city) ||
          (typeof a.town === 'string' && a.town) ||
          (typeof a.village === 'string' && a.village) ||
          (typeof a.hamlet === 'string' && a.hamlet) ||
          (typeof a.county === 'string' && a.county) ||
          '';
        const state =
          (typeof a.state === 'string' && a.state) ||
          (typeof a.region === 'string' && a.region) ||
          (typeof a.state_district === 'string' && a.state_district) ||
          '';
        const countryCode = typeof a.country_code === 'string' ? a.country_code.toUpperCase() : '';

        if (city && state) return `${city}, ${state}`;
        if (city && countryCode) return `${city}, ${countryCode}`;
        if (city) return city;
      }

      if (typeof displayName === 'string' && displayName) {
        return displayName.split(',').slice(0, 3).join(', ').trim();
      }

      return '';
    } catch {
      return '';
    } finally {
      window.clearTimeout(timeout);
    }
  }, []);

  const detectLocation = useCallback(async () => {
    setIsDetectingLocation(true);

    if ('geolocation' in navigator) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 5000,
          });
        });

        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const name = await reverseGeocode(lat, lon);
        setLocation(name || `${lat.toFixed(2)}, ${lon.toFixed(2)}`);
      } catch {
        try {
          const response = await fetch('https://ipapi.co/json/');
          const data = await response.json();
          setLocation(data.city || data.region || 'Unknown');
        } catch {
          setLocation('');
        }
      }
    } else {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        setLocation(data.city || data.region || 'Unknown');
      } catch {
        setLocation('');
      }
    }

    setIsDetectingLocation(false);
  }, [reverseGeocode]);

  useEffect(() => {
    detectLocation();
  }, [detectLocation]);

  const handleSubmit = () => {
    onSubmit({
      location: location.trim() || 'near me',
      vibe,
      dietary,
      // Keep cuisine empty; we no longer ask for food types.
      cuisine: [],
    });
  };

  return (
    <div className="max-w-lg mx-auto p-6 space-y-8">
      <div className="flex justify-center">
        <RobotLogo size={140} />
      </div>

      <p className="text-center text-muted-foreground italic text-lg">"{message}"</p>

      <div className="space-y-3">
        <div className="text-center space-y-1">
          <h2 className="text-3xl font-bold">Where are you?</h2>
          <p className="text-muted-foreground">Auto-detected, but you can edit it.</p>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="City or neighborhood"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full pl-12 pr-4 py-4 text-lg rounded-2xl border-2 border-fud-teal focus:outline-none focus:ring-4 focus:ring-fud-teal/20 bg-background"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={detectLocation}
            disabled={isDetectingLocation}
            className="rounded-2xl w-14 h-14"
            title="Use my location"
          >
            {isDetectingLocation ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-center space-y-1">
          <h2 className="text-3xl font-bold">What's the vibe?</h2>
          <p className="text-muted-foreground">Pick up to 2.</p>
        </div>
        <VibePicker selected={vibe} onChange={setVibe} max={2} />
      </div>

      <div className="space-y-3">
        <div className="text-center space-y-1">
          <h3 className="text-xl font-semibold">Dietary restrictions</h3>
          <p className="text-muted-foreground">Optional.</p>
        </div>

        <DietaryRestrictionsDropdown selected={dietary} onChange={setDietary} />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isLoading}
        className="w-full py-8 text-2xl rounded-2xl"
        size="lg"
      >
        {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Find FUD'}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        One tap. Two options. Maximum smug satisfaction.
      </p>
    </div>
  );
}
