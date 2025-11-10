
import React, { useEffect } from 'react';
import FoodFinderFlow from '@/components/FoodFinderFlow';
import ConfigLink from '@/components/ConfigLink';
import { analyticsService } from '@/services/analyticsService';

const Index = () => {
  // Track page view
  useEffect(() => {
    analyticsService.trackPageView(window.location.pathname, 'FUD Buddy - Home');
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <FoodFinderFlow />
      <ConfigLink />
    </div>
  );
};

export default Index;
