
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
      className="bg-fud-teal dark:bg-fud-peach dark:text-fud-brown text-white py-4 px-6 rounded-full font-medium text-lg shadow-md transition-all hover:shadow-lg hover:-translate-y-1 active:translate-y-0 active:shadow-sm w-full flex items-center justify-center gap-3 mb-4"
    >
      {icon && <span>{icon}</span>}
      <span>{label}</span>
    </button>
  );
};

export default ActionButton;
