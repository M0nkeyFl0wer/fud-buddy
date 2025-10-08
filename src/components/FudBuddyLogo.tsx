import React from 'react';

interface FudBuddyLogoProps {
  size?: number;
  animate?: boolean;
  showText?: boolean;
  variant?: 'primary' | 'dark' | 'light' | 'gradient';
  className?: string;
}

export const FudBuddyLogo: React.FC<FudBuddyLogoProps> = ({
  size = 120,
  animate = true,
  showText = true,
  variant = 'primary',
  className = ''
}) => {
  const logoId = `fud-logo-${Math.random().toString(36).substr(2, 9)}`;
  
  const getColors = () => {
    switch (variant) {
      case 'dark':
        return {
          primary: '#1a1a1a',
          secondary: '#333333',
          accent: '#ff6b6b',
          text: '#1a1a1a'
        };
      case 'light':
        return {
          primary: '#ffffff',
          secondary: '#f8f8f8',
          accent: '#ff6b6b',
          text: '#ffffff'
        };
      case 'gradient':
        return {
          primary: 'url(#logoGradient)',
          secondary: 'url(#logoGradient2)',
          accent: '#ff6b6b',
          text: 'url(#textGradient)'
        };
      default:
        return {
          primary: '#ff6b6b',
          secondary: '#feca57',
          accent: '#48dbfb',
          text: '#2d3436'
        };
    }
  };

  const colors = getColors();
  const logoSize = showText ? size * 1.5 : size;

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width={logoSize}
        height={logoSize * 0.8}
        viewBox="0 0 150 120"
        xmlns="http://www.w3.org/2000/svg"
        className={animate ? 'transition-transform hover:scale-105' : ''}
      >
        <defs>
          {/* Gradients for the gradient variant */}
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff6b6b" />
            <stop offset="50%" stopColor="#feca57" />
            <stop offset="100%" stopColor="#48dbfb" />
          </linearGradient>
          <linearGradient id="logoGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#feca57" />
            <stop offset="100%" stopColor="#ff6b6b" />
          </linearGradient>
          <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff6b6b" />
            <stop offset="50%" stopColor="#feca57" />
            <stop offset="100%" stopColor="#48dbfb" />
          </linearGradient>
          
          {/* Drop shadow filter */}
          <filter id={`${logoId}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3"/>
          </filter>
          
          {/* Glow effect for accent elements */}
          <filter id={`${logoId}-glow`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Main chef hat/bowl shape */}
        <g filter={`url(#${logoId}-shadow)`}>
          {/* Bowl base */}
          <ellipse 
            cx="75" 
            cy="85" 
            rx="45" 
            ry="25" 
            fill={colors.primary}
            className={animate ? 'transition-all duration-300 hover:ry-30' : ''}
          />
          
          {/* Chef hat crown */}
          <path 
            d="M30 60 Q40 30, 75 35 Q110 30, 120 60 Q115 50, 100 55 Q90 45, 75 50 Q60 45, 50 55 Q35 50, 30 60" 
            fill={colors.secondary}
            className={animate ? 'transition-all duration-300 hover:translate-y-1' : ''}
          />
          
          {/* Chef hat band */}
          <rect 
            x="35" 
            y="58" 
            width="80" 
            height="8" 
            rx="4" 
            fill={colors.primary}
          />
        </g>

        {/* Spicy steam/flames coming out */}
        <g filter={`url(#${logoId}-glow)`}>
          {/* Steam/flame 1 */}
          <path 
            d="M60 25 Q62 15, 65 20 Q67 10, 70 15 Q72 5, 75 10" 
            stroke={colors.accent} 
            strokeWidth="2.5" 
            fill="none" 
            strokeLinecap="round"
            className={animate ? 'animate-pulse' : ''}
          />
          
          {/* Steam/flame 2 */}
          <path 
            d="M75 20 Q77 10, 80 15 Q82 5, 85 10 Q87 0, 90 5" 
            stroke={colors.accent} 
            strokeWidth="2.5" 
            fill="none" 
            strokeLinecap="round"
            className={animate ? 'animate-pulse' : ''}
            style={animate ? { animationDelay: '0.2s' } : {}}
          />
          
          {/* Steam/flame 3 */}
          <path 
            d="M45 30 Q47 20, 50 25 Q52 15, 55 20 Q57 10, 60 15" 
            stroke={colors.accent} 
            strokeWidth="2" 
            fill="none" 
            strokeLinecap="round"
            className={animate ? 'animate-pulse' : ''}
            style={animate ? { animationDelay: '0.4s' } : {}}
          />
        </g>

        {/* Cute face on the chef hat */}
        <g>
          {/* Eyes */}
          <circle cx="65" cy="45" r="2.5" fill={colors.text} />
          <circle cx="85" cy="45" r="2.5" fill={colors.text} />
          
          {/* Winking effect */}
          {animate && (
            <circle cx="65" cy="45" r="2.5" fill={colors.text}>
              <animate attributeName="ry" values="2.5;0.5;2.5" dur="3s" repeatCount="indefinite" />
            </circle>
          )}
          
          {/* Sassy smile */}
          <path 
            d="M70 52 Q75 57, 80 52" 
            stroke={colors.text} 
            strokeWidth="1.5" 
            fill="none" 
            strokeLinecap="round"
          />
        </g>

        {/* Spice sparkles around the logo */}
        <g filter={`url(#${logoId}-glow)`}>
          <g className={animate ? 'animate-spin' : ''} style={animate ? { animationDuration: '20s' } : {}}>
            <circle cx="25" cy="40" r="1.5" fill={colors.accent} opacity="0.8" />
            <circle cx="125" cy="35" r="1" fill={colors.accent} opacity="0.6" />
            <circle cx="20" cy="70" r="1.2" fill={colors.accent} opacity="0.7" />
            <circle cx="130" cy="65" r="1.3" fill={colors.accent} opacity="0.9" />
          </g>
          
          {/* Plus signs for extra spice */}
          <g className={animate ? 'animate-pulse' : ''} style={animate ? { animationDuration: '2s' } : {}}>
            <text x="15" y="25" fontSize="8" fill={colors.accent} opacity="0.8">+</text>
            <text x="135" y="45" fontSize="6" fill={colors.accent} opacity="0.6">+</text>
            <text x="10" y="85" fontSize="7" fill={colors.accent} opacity="0.7">+</text>
          </g>
        </g>
      </svg>

      {showText && (
        <div className="flex flex-col">
          <h1 
            className={`text-2xl font-black tracking-tight leading-none ${
              variant === 'gradient' ? 'bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-clip-text text-transparent' :
              variant === 'light' ? 'text-white' :
              variant === 'dark' ? 'text-gray-900' :
              'text-gray-900'
            }`}
            style={{ fontSize: size * 0.2 }}
          >
            FUD
          </h1>
          <p 
            className={`text-lg font-bold tracking-wide leading-none ${
              variant === 'gradient' ? 'bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-clip-text text-transparent' :
              variant === 'light' ? 'text-white' :
              variant === 'dark' ? 'text-gray-900' :
              'text-gray-700'
            }`}
            style={{ fontSize: size * 0.12, marginTop: -2 }}
          >
            BUDDY
          </p>
          <span 
            className={`text-xs font-medium tracking-wider uppercase ${
              variant === 'light' ? 'text-white/70' :
              variant === 'dark' ? 'text-gray-600' :
              'text-gray-500'
            }`}
            style={{ fontSize: size * 0.06, marginTop: 1 }}
          >
            Your Sassy Food AI
          </span>
        </div>
      )}
    </div>
  );
};

// Compact version for smaller spaces
export const FudBuddyLogoCompact: React.FC<{size?: number, className?: string}> = ({ 
  size = 40, 
  className = '' 
}) => {
  return (
    <FudBuddyLogo 
      size={size} 
      showText={false} 
      animate={true} 
      variant="primary"
      className={className}
    />
  );
};

// App icon version (square, optimized for app stores)
export const FudBuddyAppIcon: React.FC<{size?: number}> = ({ size = 120 }) => {
  return (
    <div 
      className="relative bg-gradient-to-br from-red-500 via-yellow-400 to-blue-500 rounded-2xl shadow-2xl flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <FudBuddyLogo 
        size={size * 0.7} 
        showText={false} 
        animate={false} 
        variant="light"
      />
      
      {/* Subtle inner shadow for depth */}
      <div 
        className="absolute inset-0 rounded-2xl"
        style={{
          boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.1), inset 0 -2px 10px rgba(255,255,255,0.1)'
        }}
      />
    </div>
  );
};