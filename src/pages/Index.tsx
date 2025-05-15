
import React, { useState, useEffect } from 'react';
import { MapPin, Utensils, Zap } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import RobotLogo from '@/components/RobotLogo';
import ActionButton from '@/components/ActionButton';
import FUDChat from '@/components/FUDChat';
import { usePrivacy } from '@/hooks/usePrivacy';

type ActiveView = 'home' | 'whereToGo' | 'whatToOrder' | 'somethingFun';

const Index = () => {
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const { toast } = useToast();
  const { trackEvent } = usePrivacy();
  
  // Track page view
  useEffect(() => {
    trackEvent('page_view', { page: 'home' });
  }, [trackEvent]);
  
  const handleActionClick = (action: ActiveView) => {
    if (action === 'home') return;
    
    setActiveView(action);
    trackEvent('feature_click', { feature: action });
  };
  
  const handleBackToHome = () => {
    setActiveView('home');
  };

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
              <RobotLogo size={240} />
              <h1 className="text-3xl font-bold mt-4">FUD Buddy</h1>
              <p className="text-gray-600 mt-2">Your AI food recommendation buddy</p>
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
    </div>
  );
};

export default Index;
