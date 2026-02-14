import { useState } from 'react';
import RobotLogo from '@/components/RobotLogo';
import { PreferenceSelector, UserPreferences } from '@/components/preferences';
import { StreamingChat } from '@/components/chat';
import { OSINTReveal } from '@/components/OSINTReveal';
import ConfigLink from '@/components/ConfigLink';

type View = 'home' | 'search';

const Index = () => {
  const [view, setView] = useState<View>('home');
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePreferencesSubmit = (prefs: UserPreferences) => {
    setPreferences(prefs);
    setView('search');
  };

  const handleBack = () => {
    setView('home');
    setPreferences(null);
  };

  return (
    <div className="min-h-screen flex flex-col pb-16">
      {view === 'home' && (
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <RobotLogo size={280} />
            <h1 className="text-3xl font-bold mt-4">FUD Buddy</h1>
            <p className="text-muted-foreground mt-2">
              Food recommendations with zero judgment.
            </p>
          </div>
          
          <PreferenceSelector 
            onSubmit={handlePreferencesSubmit}
            isLoading={isLoading}
          />
          
          <div className="mt-8">
            <ConfigLink />
          </div>
        </div>
      )}

      {view === 'search' && preferences && (
        <StreamingChat
          preferences={preferences}
          onBack={handleBack}
        />
      )}

      <OSINTReveal />
    </div>
  );
};

export default Index;
