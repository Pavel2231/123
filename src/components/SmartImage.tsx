import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';

interface SmartImageProps {
  src: string;
  alt: string;
  className?: string;
}

export const SmartImage: React.FC<SmartImageProps> = ({ src, alt, className = '' }) => {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#1A142D] via-[#130E22] to-[#261B42] text-[#C4B5FD] p-4 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Sparkles className="w-6 h-6 mb-2 opacity-75" />
        <span className="text-xs font-medium line-clamp-2 max-w-[200px]">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
