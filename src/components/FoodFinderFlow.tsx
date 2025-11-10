import React, { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RobotLogo from '@/components/RobotLogo';
import PreferenceSelector, { FoodPreference } from '@/components/PreferenceSelector';
import RestaurantCard from '@/components/RestaurantCard';
import PrivacyRevealModal from '@/components/PrivacyRevealModal';
import { locationService, LocationData } from '@/services/locationService';
import { searchService, RestaurantData } from '@/services/searchService';
import { privacyTrackingService } from '@/services/privacyTrackingService';
import { useToast } from '@/components/ui/use-toast';

type FlowStep = 'welcome' | 'location' | 'preferences' | 'results' | 'privacy-reveal';

const FoodFinderFlow: React.FC = () => {
  const [step, setStep] = useState<FlowStep>('welcome');
  const [location, setLocation] = useState<LocationData | null>(null);
  const [preferences, setPreferences] = useState<FoodPreference[]>([]);
  const [restaurants, setRestaurants] = useState<RestaurantData[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showPrivacyReveal, setShowPrivacyReveal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Check if we should show privacy reveal
  useEffect(() => {
    if (privacyTrackingService.shouldShowPrivacyReveal()) {
      setShowPrivacyReveal(true);
    }
  }, [step]);

  const handleStart = () => {
    setStep('location');
  };

  const handleLocationRequest = async () => {
    setIsLoading(true);
    try {
      const loc = await locationService.getCurrentLocation();
      setLocation(loc);

      // Track location grant
      privacyTrackingService.trackAction('location_grant', { location: loc });

      toast({
        title: '📍 Location detected',
        description: locationService.formatLocation(loc)
      });

      setStep('preferences');
    } catch (error) {
      toast({
        title: 'Location error',
        description: error instanceof Error ? error.message : 'Could not get your location',
        variant: 'destructive'
      });

      // Allow manual city entry fallback
      const manualCity = prompt('Enter your city name:');
      if (manualCity) {
        const manualLoc: LocationData = {
          latitude: 0,
          longitude: 0,
          city: manualCity
        };
        setLocation(manualLoc);
        setStep('preferences');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreferencesSelected = async (prefs: FoodPreference[]) => {
    setPreferences(prefs);

    // Track preference selection
    privacyTrackingService.trackAction('preference_select', {
      preferences: prefs,
      location: location || undefined
    });

    setIsLoading(true);

    try {
      // Search for restaurants
      const results = await searchService.searchRestaurants({
        city: location?.city,
        location: location ? { lat: location.latitude, lng: location.longitude } : undefined,
        preferences: prefs
      });

      setRestaurants(results);

      // Track search
      privacyTrackingService.trackAction('search', {
        preferences: prefs,
        location: location || undefined
      });

      setStep('results');
    } catch (error) {
      toast({
        title: 'Search error',
        description: 'Could not find restaurants. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetDirections = () => {
    const restaurant = restaurants[currentCardIndex];
    if (!restaurant) return;

    // Open Google Maps
    const query = encodeURIComponent(`${restaurant.name} ${restaurant.address}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');

    // Track card view
    privacyTrackingService.trackAction('card_view');
  };

  const handleNextCard = () => {
    if (currentCardIndex < restaurants.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else {
      // Loop back to first card
      setCurrentCardIndex(0);
    }
  };

  const handlePreviousCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
    } else {
      // Loop to last card
      setCurrentCardIndex(restaurants.length - 1);
    }
  };

  const handleTryAgain = () => {
    setStep('preferences');
    setCurrentCardIndex(0);
  };

  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return (
          <div className="max-w-md mx-auto px-4 py-8 text-center">
            <RobotLogo size={320} />
            <h1 className="text-4xl font-bold mt-6 mb-2">FUD Buddy</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
              We know what you want to eat before you do
            </p>
            <Button
              onClick={handleStart}
              size="lg"
              className="bg-fud-teal dark:bg-fud-peach text-white px-8 py-6 text-lg"
            >
              Find Me Food →
            </Button>
          </div>
        );

      case 'location':
        return (
          <div className="max-w-md mx-auto px-4 py-8 text-center">
            <MapPin size={64} className="mx-auto mb-6 text-fud-teal dark:text-fud-peach" />
            <h2 className="text-2xl font-bold mb-4">Where are you?</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8">
              We need your location to find the best food nearby
            </p>
            <Button
              onClick={handleLocationRequest}
              disabled={isLoading}
              size="lg"
              className="bg-fud-teal dark:bg-fud-peach text-white px-8"
            >
              {isLoading ? 'Getting location...' : 'Share My Location'}
            </Button>
            <p className="text-xs text-gray-500 mt-4">
              Don't worry, we'll show you exactly what we track 😉
            </p>
          </div>
        );

      case 'preferences':
        return (
          <PreferenceSelector
            onSelectPreferences={handlePreferencesSelected}
            location={location ? locationService.formatLocation(location) : undefined}
          />
        );

      case 'results':
        if (restaurants.length === 0) {
          return (
            <div className="max-w-md mx-auto px-4 py-8 text-center">
              <p className="text-xl mb-4">No restaurants found 😔</p>
              <Button onClick={handleTryAgain}>Try Different Preferences</Button>
            </div>
          );
        }

        return (
          <div className="max-w-md mx-auto px-4 py-8">
            <div className="text-center mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {currentCardIndex + 1} of {restaurants.length}
              </p>
            </div>

            <RestaurantCard
              restaurant={restaurants[currentCardIndex]}
              onGetDirections={handleGetDirections}
            />

            <div className="flex gap-2 mt-6">
              <Button variant="outline" onClick={handlePreviousCard} className="flex-1">
                ← Previous
              </Button>
              <Button variant="outline" onClick={handleNextCard} className="flex-1">
                Next →
              </Button>
            </div>

            <div className="text-center mt-6">
              <Button variant="ghost" onClick={handleTryAgain} size="sm">
                Try Different Preferences
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {renderStep()}

      <PrivacyRevealModal
        open={showPrivacyReveal}
        onClose={() => setShowPrivacyReveal(false)}
      />
    </div>
  );
};

export default FoodFinderFlow;
