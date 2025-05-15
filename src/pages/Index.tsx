
import React, { useState, useEffect } from 'react';
import { MapPin, Utensils, Zap } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import RobotLogo from '@/components/RobotLogo';
import ActionButton from '@/components/ActionButton';
import FUDChat from '@/components/FUDChat';
import { AIChatType } from '@/services/aiService';
import { analyticsService } from '@/services/analyticsService';
import ConfigLink from '@/components/ConfigLink';

const Index = () => {
  const [activeView, setActiveView] = useState<AIChatType | 'home'>('home');
  const { toast } = useToast();
  
  const handleActionClick = (action: AIChatType) => {
    if (action === 'home') return;
    
    setActiveView(action);
    analyticsService.trackEvent('feature_click', { feature: action });
  };
  
  const handleBackToHome = () => {
    setActiveView('home');
    analyticsService.trackEvent('navigation', { action: 'back_to_home' });
  };

  // Track page view
  useEffect(() => {
    analyticsService.trackPageView(window.location.pathname, 'FUD Buddy - Home');
  }, []);

  // Render content based on active view
  const renderContent = () => {
    switch (activeView) {
      case 'whereToGo':
      case 'whatToOrder':
      case 'somethingFun':
        return (
          <FUDChat 
            chatType={activeView} 
            onBack={handleBackToHome}
          />
        );
      default:
        return (
          <div className="max-w-md mx-auto px-4 py-8">
            <div className="text-center mb-8">
              <RobotLogo size={320} />
              <h1 className="text-3xl font-bold mt-4">FUD Buddy</h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">Your food recommendation AI buddy</p>
            </div>
            
            <div className="space-y-4">
              <ActionButton 
                label="Where to Go" 
                icon={<MapPin />}
                onClick={() => handleActionClick('whereToGo')} 
              />
              
              <ActionButton 
                label="What to Order" 
                icon={<Utensils />}
                onClick={() => handleActionClick('whatToOrder')} 
              />
              
              <ActionButton 
                label="Something Fun" 
                icon={<Zap />}
                onClick={() => handleActionClick('somethingFun')} 
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {renderContent()}
      {activeView === 'home' && <ConfigLink />}
    </div>
  );
};

export default Index;
