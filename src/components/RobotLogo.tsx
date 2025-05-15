import React, { useEffect, useRef, useState } from 'react';

interface RobotLogoProps {
  size?: number;
}

const RobotLogo: React.FC<RobotLogoProps> = ({ size = 280 }) => {
  const robotRef = useRef<HTMLDivElement>(null);
  const [eyePosition, setEyePosition] = useState({ x: 0, y: 0 });

  // Track mouse movement to move eyes
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (robotRef.current) {
        const rect = robotRef.current.getBoundingClientRect();
        
        // Calculate eye position based on mouse position relative to the robot logo
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Normalize the position (-1 to 1 range)
        const x = (e.clientX - centerX) / (window.innerWidth / 4);
        const y = (e.clientY - centerY) / (window.innerHeight / 4);
        
        // Limit the range to keep eyes inside the visor
        const clampedX = Math.max(-1, Math.min(1, x));
        const clampedY = Math.max(-1, Math.min(1, y));
        
        setEyePosition({ x: clampedX, y: clampedY });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div 
      ref={robotRef}
      className="robot-logo relative"
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <div className="relative w-full h-full">
        {/* Base robot image */}
        <img 
          src="/lovable-uploads/0b1e02ba-8cbd-479e-8db2-2ecd3a1b23aa.png" 
          alt="FUD Buddy Logo" 
          className="w-full h-full rounded-3xl overflow-hidden shadow-lg"
        />
        
        {/* Left Eye - positioned where eyes would be in the robot visor */}
        <div 
          className="absolute bg-white rounded-full"
          style={{
            width: size * 0.05,
            height: size * 0.05,
            top: size * 0.38, 
            left: size * 0.31,
            transform: `translate(${eyePosition.x * 5}px, ${eyePosition.y * 3}px)`,
            transition: 'transform 0.1s ease',
          }}
        >
          <div 
            className="absolute bg-black rounded-full"
            style={{
              width: '50%',
              height: '50%',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />
        </div>
        
        {/* Right Eye - positioned where eyes would be in the robot visor */}
        <div 
          className="absolute bg-white rounded-full"
          style={{
            width: size * 0.05,
            height: size * 0.05,
            top: size * 0.38,
            left: size * 0.61,
            transform: `translate(${eyePosition.x * 5}px, ${eyePosition.y * 3}px)`,
            transition: 'transform 0.1s ease',
          }}
        >
          <div 
            className="absolute bg-black rounded-full"
            style={{
              width: '50%',
              height: '50%',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default RobotLogo;
