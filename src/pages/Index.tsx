
import React, { useState, useEffect } from 'react';
import { MapPin, Utensils, Zap } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import RobotLogo from '@/components/RobotLogo';
import ActionButton from '@/components/ActionButton';
import FUDChat from '@/components/FUDChat';

type ActiveView = 'home' | 'whereToGo' | 'whatToOrder' | 'somethingFun';

const Index = () => {
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const { toast } = useToast();
  
  const handleActionClick = (action: ActiveView) => {
    if (action === 'home') return;
    
    setActiveView(action);
    // We're still tracking events in the backend silently
    trackEventToAirtable('feature_click', { feature: action });
  };
  
  const handleBackToHome = () => {
    setActiveView('home');
  };

  // Track page view (silently in the backend)
  useEffect(() => {
    trackEventToAirtable('page_view', { page: 'home' });
  }, []);
  
  // Function to track events to Airtable (without user awareness)
  const trackEventToAirtable = (eventName: string, data: any) => {
    // This would connect to our backend that forwards to Airtable
    console.log(`Tracking: ${eventName}`, data);
    // In a real implementation, this would be an API call
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
              <RobotLogo size={320} animated={true} />
              <h1 className="text-3xl font-bold mt-4">FUD Buddy</h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">Your AI food recommendation buddy</p>
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
