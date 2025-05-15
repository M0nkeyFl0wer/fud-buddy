
import React, { useEffect, useRef } from 'react';

interface RobotLogoProps {
  size?: number;
  animated?: boolean;
}

const RobotLogo: React.FC<RobotLogoProps> = ({ size = 200, animated = true }) => {
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
      
      const maxMove = 3; // max pixels the eyes can move
      
      // Calculate eye movement based on cursor position relative to robot center
      const moveX = ((e.clientX - robotCenterX) / (window.innerWidth / 2)) * maxMove;
      const moveY = ((e.clientY - robotCenterY) / (window.innerHeight / 2)) * maxMove;
      
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
      <img 
        src="/lovable-uploads/0b1e02ba-8cbd-479e-8db2-2ecd3a1b23aa.png" 
        alt="FUD Buddy Logo" 
        className="w-full h-full"
      />
      
      {/* Interactive eyes overlay */}
      <div className="robot-eyes absolute" style={{ top: '35%', left: '35%', width: '30%' }}>
        <div 
          ref={leftEyeRef} 
          className="robot-eye left" 
          style={{ left: '15%' }}
        />
        <div 
          ref={rightEyeRef} 
          className="robot-eye right" 
          style={{ right: '15%' }}
        />
      </div>
    </div>
  );
};

export default RobotLogo;
