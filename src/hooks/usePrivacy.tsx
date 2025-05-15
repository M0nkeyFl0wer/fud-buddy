
import { useState, useEffect } from 'react';

export const usePrivacy = () => {
  // Default to tracking enabled
  const [trackingEnabled, setTrackingEnabled] = useState<boolean>(true);
  
  // Load preference from localStorage on mount
  useEffect(() => {
    const storedPreference = localStorage.getItem('fud-tracking-enabled');
    if (storedPreference !== null) {
      setTrackingEnabled(storedPreference === 'true');
    }
  }, []);
  
  // Update localStorage when preference changes
  const toggleTracking = (enabled: boolean) => {
    setTrackingEnabled(enabled);
    localStorage.setItem('fud-tracking-enabled', enabled.toString());
    
    // Mock analytics event
    if (enabled) {
      console.log('[Analytics] Tracking enabled');
    } else {
      console.log('[Analytics] Tracking disabled');
    }
  };
  
  // Mock function to track an event
  const trackEvent = (eventName: string, properties?: Record<string, any>) => {
    if (trackingEnabled) {
      console.log(`[Analytics] Event: ${eventName}`, properties || '');
    }
  };
  
  return {
    trackingEnabled,
    toggleTracking,
    trackEvent
  };
};
