
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
        
        // Calculate distance from center (normalized)
        const deltaX = (e.clientX - centerX) / (window.innerWidth / 6);
        const deltaY = (e.clientY - centerY) / (window.innerHeight / 6);
        
        // Limit the movement range (smaller value = more constrained movement)
        const maxMove = 4;
        const clampedX = Math.max(-1, Math.min(1, deltaX)) * maxMove;
        const clampedY = Math.max(-1, Math.min(1, deltaY)) * maxMove;
        
        setEyePosition({ x: clampedX, y: clampedY });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Add a more accessible way to disable animation
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setEyePosition({ x: 0, y: 0 });
    }
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
        
        {/* Left Eye */}
        <div 
          className="absolute bg-white rounded-full"
          style={{
            width: size * 0.06,
            height: size * 0.06,
            top: size * 0.38, 
            left: size * 0.33,
            transform: `translate(${eyePosition.x}px, ${eyePosition.y}px)`,
            transition: 'transform 0.15s ease-out',
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
        
        {/* Right Eye */}
        <div 
          className="absolute bg-white rounded-full"
          style={{
            width: size * 0.06,
            height: size * 0.06,
            top: size * 0.38,
            left: size * 0.62,
            transform: `translate(${eyePosition.x}px, ${eyePosition.y}px)`,
            transition: 'transform 0.15s ease-out',
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
