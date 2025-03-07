
import React from 'react';

interface UnsplashImageProps {
  src: string;
  alt?: string;
  className?: string;
  showAttribution?: boolean;
}

const UnsplashImage: React.FC<UnsplashImageProps> = ({ 
  src, 
  alt = "Image",
  className = "",
  showAttribution = true
}) => {
  return (
    <div className="relative min-h-[300px] overflow-hidden">
      <img
        src={src}
        alt={alt}
        className={className}
      />
      {showAttribution && (
        <div className="absolute bottom-4 right-4 text-white text-sm bg-black/50 px-2 py-1 rounded backdrop-blur-sm opacity-70 hover:opacity-100 transition-opacity">
          <a
            href="https://unsplash.com?utm_source=travel_planner&utm_medium=referral"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Unsplash
          </a>
        </div>
      )}
    </div>
  );
};

export default UnsplashImage;
