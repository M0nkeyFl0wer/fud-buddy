
import React, { useEffect, useRef } from 'react';

interface RobotLogoProps {
  size?: number;
  animated?: boolean;
}

const RobotLogo: React.FC<RobotLogoProps> = ({ size = 280, animated = true }) => {
  const robotRef = useRef<HTMLDivElement>(null);
  const leftEyeRef = useRef<HTMLDivElement>(null);
  const rightEyeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!animated) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!robotRef.current || !leftEyeRef.current || !rightEyeRef.current) return;
      
      const robotRect = robotRef.current.getBoundingClientRect();
      const robotCenterX = robotRect.left + robotRect.width / 2;
      const robotCenterY = robotRect.top + robotRect.height / 2;
      
      const maxMoveX = 15; // increased horizontal movement
      const maxMoveY = 12; // increased vertical movement
      
      // Calculate eye movement based on cursor position relative to robot center
      const moveX = ((e.clientX - robotCenterX) / (window.innerWidth / 2)) * maxMoveX;
      const moveY = ((e.clientY - robotCenterY) / (window.innerHeight / 2)) * maxMoveY;
      
      leftEyeRef.current.style.transform = `translate(${moveX}px, ${moveY}px)`;
      rightEyeRef.current.style.transform = `translate(${moveX}px, ${moveY}px)`;
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [animated]);

  return (
    <div 
      className="robot-logo relative"
      ref={robotRef}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <div className="relative w-full h-full">
        <img 
          src="/lovable-uploads/0b1e02ba-8cbd-479e-8db2-2ecd3a1b23aa.png" 
          alt="FUD Buddy Logo" 
          className="w-full h-full"
        />
        
        {/* Eye overlay - positioned precisely over the robot's eye area */}
        <div className="absolute" style={{ top: '35%', left: '0', width: '100%', height: '10%' }}>
          {/* Left eye */}
          <div 
            ref={leftEyeRef}
            className="absolute bg-fud-brown rounded-full w-[14px] h-[14px]" 
            style={{ left: '30%', top: '50%', transform: 'translate(0, -50%)' }}
          />
          
          {/* Right eye */}
          <div 
            ref={rightEyeRef}
            className="absolute bg-fud-brown rounded-full w-[14px] h-[14px]" 
            style={{ left: '68%', top: '50%', transform: 'translate(0, -50%)' }}
          />
        </div>
      </div>
    </div>
  );
};

export default RobotLogo;
