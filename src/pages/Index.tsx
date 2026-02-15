import { useState } from 'react';
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
        <PreferenceSelector 
          onSubmit={handlePreferencesSubmit}
          isLoading={isLoading}
        />
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
