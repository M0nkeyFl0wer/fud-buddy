import React, { useState } from 'react';
import { Leaf, Flame, Sparkles, Coffee } from 'lucide-react';

export type FoodPreference = 'no-meat' | 'spicy' | 'fancy' | 'casual';

interface PreferenceSelectorProps {
  onSelectPreferences: (preferences: FoodPreference[]) => void;
  location?: string;
}

const PreferenceSelector: React.FC<PreferenceSelectorProps> = ({ onSelectPreferences, location }) => {
  const [selected, setSelected] = useState<FoodPreference[]>([]);

  const preferences = [
    { id: 'no-meat' as FoodPreference, label: 'No Meat', icon: Leaf, color: 'bg-green-500' },
    { id: 'spicy' as FoodPreference, label: 'Spicy', icon: Flame, color: 'bg-red-500' },
    { id: 'fancy' as FoodPreference, label: 'Fancy', icon: Sparkles, color: 'bg-purple-500' },
    { id: 'casual' as FoodPreference, label: 'Casual', icon: Coffee, color: 'bg-blue-500' }
  ];

  const togglePreference = (pref: FoodPreference) => {
    setSelected(prev =>
      prev.includes(pref)
        ? prev.filter(p => p !== pref)
        : [...prev, pref]
    );
  };

  const handleContinue = () => {
    if (selected.length > 0) {
      onSelectPreferences(selected);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">What are you in the mood for?</h2>
        {location && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            📍 {location}
          </p>
        )}
        <p className="text-gray-600 dark:text-gray-400 mt-4">
          Select all that apply
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {preferences.map((pref) => {
          const Icon = pref.icon;
          const isSelected = selected.includes(pref.id);

          return (
            <button
              key={pref.id}
              onClick={() => togglePreference(pref.id)}
              className={`
                relative p-6 rounded-2xl font-medium text-lg
                transition-all duration-200 transform
                ${isSelected
                  ? `${pref.color} text-white scale-105 shadow-lg`
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:scale-105'
                }
              `}
            >
              <div className="flex flex-col items-center gap-3">
                <Icon size={32} />
                <span>{pref.label}</span>
              </div>
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                    <span className="text-sm">✓</span>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={handleContinue}
        disabled={selected.length === 0}
        className={`
          w-full py-4 px-6 rounded-full font-medium text-lg
          transition-all duration-200
          ${selected.length > 0
            ? 'bg-fud-teal dark:bg-fud-peach text-white shadow-lg hover:shadow-xl hover:-translate-y-1'
            : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
          }
        `}
      >
        Find My Food →
      </button>
    </div>
  );
};

export default PreferenceSelector;
