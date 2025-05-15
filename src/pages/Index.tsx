
import React, { useState, useEffect } from 'react';
import { bot, MapPin, Utensils, Zap } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import RobotLogo from '@/components/RobotLogo';
import ActionButton from '@/components/ActionButton';
import FUDChat from '@/components/FUDChat';
import PrivacyToggle from '@/components/PrivacyToggle';
import PrivacyModal from '@/components/PrivacyModal';
import { usePrivacy } from '@/hooks/usePrivacy';

type ActiveView = 'home' | 'whereToGo' | 'whatToOrder' | 'somethingFun';

const Index = () => {
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const { toast } = useToast();
  const { trackingEnabled, toggleTracking, trackEvent } = usePrivacy();
  
  // Show privacy modal on first visit
  useEffect(() => {
    const hasSeenPrivacyModal = localStorage.getItem('fud-privacy-seen');
    if (!hasSeenPrivacyModal) {
      setShowPrivacyModal(true);
      localStorage.setItem('fud-privacy-seen', 'true');
    }
  }, []);
  
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
  
  const handlePrivacyClick = () => {
    setShowPrivacyModal(true);
    trackEvent('privacy_info_click');
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
              <RobotLogo size={180} />
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
            
            <button 
              onClick={handlePrivacyClick}
              className="mt-8 text-xs text-gray-500 underline mx-auto block"
            >
              Learn about our privacy policy
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {renderContent()}
      
      <PrivacyToggle 
        enabled={trackingEnabled} 
        onToggle={toggleTracking} 
      />
      
      <PrivacyModal 
        open={showPrivacyModal} 
        onClose={() => setShowPrivacyModal(false)} 
      />
    </div>
  );
};

export default Index;
