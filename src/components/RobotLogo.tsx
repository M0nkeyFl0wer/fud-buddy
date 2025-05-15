
import React from 'react';

interface RobotLogoProps {
  size?: number;
}

const RobotLogo: React.FC<RobotLogoProps> = ({ size = 280 }) => {
  return (
    <div 
      className="robot-logo relative"
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <div className="relative w-full h-full">
        <img 
          src="/lovable-uploads/0b1e02ba-8cbd-479e-8db2-2ecd3a1b23aa.png" 
          alt="FUD Buddy Logo" 
          className="w-full h-full rounded-3xl overflow-hidden shadow-lg"
        />
      </div>
    </div>
  );
};

export default RobotLogo;
