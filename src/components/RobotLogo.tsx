
import React, { useEffect, useRef, useState } from 'react';

interface RobotLogoProps {
  size?: number;
}

const RobotLogo: React.FC<RobotLogoProps> = ({ size = 280 }) => {
  const robotRef = useRef<HTMLDivElement>(null);
  const [logoPosition, setLogoPosition] = useState({ x: 0, y: 0 });

  // Track mouse movement to move the entire logo
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (robotRef.current) {
        const rect = robotRef.current.getBoundingClientRect();
        
        // Calculate center of the robot
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Calculate distance from center (normalized)
        const deltaX = (e.clientX - centerX) / (window.innerWidth / 6);
        const deltaY = (e.clientY - centerY) / (window.innerHeight / 6);
        
        // Subtle movement for the logo
        const maxLogoMove = 4;
        const clampedLogoX = Math.max(-1, Math.min(1, deltaX)) * maxLogoMove;
        const clampedLogoY = Math.max(-1, Math.min(1, deltaY)) * maxLogoMove;
        
        setLogoPosition({ x: clampedLogoX, y: clampedLogoY });
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
      setLogoPosition({ x: 0, y: 0 });
    }
  }, []);

  return (
    <div 
      ref={robotRef}
      className="robot-logo relative"
      style={{ 
        width: `${size}px`, 
        height: `${size}px`,
        transform: `translate(${logoPosition.x}px, ${logoPosition.y}px)`,
        transition: 'transform 0.3s ease-out',
      }}
    >
      <div className="relative w-full h-full">
        {/* Base robot image */}
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
