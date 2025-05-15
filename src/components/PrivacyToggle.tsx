
import React from 'react';
import { Switch } from "@/components/ui/switch";

interface PrivacyToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

const PrivacyToggle: React.FC<PrivacyToggleProps> = ({ enabled, onToggle }) => {
  return (
    <div className="fixed bottom-4 left-4 flex items-center gap-2 bg-white bg-opacity-80 backdrop-blur-sm p-2 rounded-full shadow-sm">
      <span className="text-xs md:text-sm text-gray-700">
        Tracking {enabled ? 'On' : 'Off'}
      </span>
      <Switch
        checked={enabled}
        onCheckedChange={onToggle}
      />
    </div>
  );
};

export default PrivacyToggle;
