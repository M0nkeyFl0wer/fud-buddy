import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CuisinePicker } from './CuisinePicker';
import { DietaryPicker } from './DietaryPicker';
import { VibePicker } from './VibePicker';
import { MapPin, ArrowRight, Loader2 } from 'lucide-react';
import type { UserPreferences } from '@/services/api';
import { ONBOARDING_MESSAGES } from '@/services/messages';

interface PreferenceSelectorProps {
  onSubmit: (preferences: UserPreferences) => void;
  isLoading?: boolean;
}

export function PreferenceSelector({ onSubmit, isLoading }: PreferenceSelectorProps) {
  const [location, setLocation] = useState('');
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [vibe, setVibe] = useState<string[]>([]);
  const [cuisine, setCuisine] = useState<string[]>([]);
  const [dietary, setDietary] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  // Random onboarding message on mount
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
        
        // Reverse geocode would go here - for now just use coords
        setLocation(`${position.coords.latitude.toFixed(2)}, ${position.coords.longitude.toFixed(2)}`);
      } catch {
        // Fall back to IP-based detection (would call backend)
        try {
          const response = await fetch('https://ipapi.co/json/');
          const data = await response.json();
          setLocation(data.city || data.region || 'Unknown');
        } catch {
          setLocation('');
        }
      }
    } else {
      // No geolocation, try IP API
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
    // Try to auto-detect on mount
    detectLocation();
  }, []);

  const handleSubmit = () => {
    onSubmit({
      location: location.trim() || 'near me',
      vibe,
      cuisine,
      dietary,
    });
  };

  const isValid = vibe.length > 0 || cuisine.length > 0 || location.trim();

  return (
    <div className="space-y-6 max-w-md mx-auto p-4">
      <p className="text-center text-muted-foreground italic">
        "{message}"
      </p>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Where are you?</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="City or use current location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button 
            variant="outline" 
            size="icon"
            onClick={detectLocation}
            disabled={isDetectingLocation}
            title="Use my location"
          >
            {isDetectingLocation ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MapPin className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium">What's the vibe?</label>
        <VibePicker selected={vibe} onChange={setVibe} max={2} />
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium">What do you want to eat?</label>
        <CuisinePicker selected={cuisine} onChange={setCuisine} max={3} />
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium">Any dietary needs?</label>
        <DietaryPicker selected={dietary} onChange={setDietary} />
      </div>

      <Button 
        onClick={handleSubmit} 
        disabled={!isValid || isLoading}
        className="w-full gap-2"
        size="lg"
      >
        {isLoading ? 'Finding FUD...' : 'Find FUD please'}
        {!isLoading && <ArrowRight className="w-4 h-4" />}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        FUD Buddy will find you the good stuff. Probably.
      </p>
    </div>
  );
}
