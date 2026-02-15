import React from 'react';

interface LogoMarkProps {
  size?: number;
  className?: string;
  alt?: string;
}

export default function LogoMark({ size = 40, className = '', alt = 'FUD Buddy' }: LogoMarkProps) {
  return (
    <img
      src="/fud-buddy-logo.png"
      alt={alt}
      width={size}
      height={size}
      className={`rounded-xl shadow-sm ${className}`.trim()}
      loading="eager"
      decoding="async"
    />
  );
}
