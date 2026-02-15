import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { VibePicker } from './VibePicker';
import { MapPin, Loader2, Sparkles } from 'lucide-react';
import type { UserPreferences } from '@/services/api';
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

  const detectLocation = async () => {
    setIsDetectingLocation(true);

    if ('geolocation' in navigator) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 5000,
          });
        });
        setLocation(`${position.coords.latitude.toFixed(2)}, ${position.coords.longitude.toFixed(2)}`);
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
  };

  useEffect(() => {
    detectLocation();
  }, []);

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
