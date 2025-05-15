
import React from 'react';

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

const ActionButton: React.FC<ActionButtonProps> = ({ label, onClick, icon }) => {
  return (
    <button 
      onClick={onClick} 
      className="fud-button w-full flex items-center justify-center gap-3 mb-4"
    >
      {icon && <span>{icon}</span>}
      <span>{label}</span>
    </button>
  );
};

export default ActionButton;
