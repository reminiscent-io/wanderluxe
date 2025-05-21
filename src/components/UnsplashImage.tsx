
import React from 'react';

interface UnsplashImageProps {
  src: string;
  alt?: string;
  className?: string;
  showAttribution?: boolean;
  objectPosition?: string;
  photographer?: string;
  unsplashUsername?: string;
}

const UnsplashImage: React.FC<UnsplashImageProps> = ({ 
  src, 
  alt = "Image",
  className = "",
  showAttribution = true,
  objectPosition = "center",
  photographer,
  unsplashUsername
}) => {
  console.log('UnsplashImage rendering with objectPosition:', objectPosition);
  
  return (
    <div className="relative min-h-[300px] overflow-hidden">
      <img
        src={src}
        alt={alt}
        className={className}
        style={{ objectPosition }}
      />
      {showAttribution && (
        <div className="absolute bottom-4 right-4 text-white text-sm bg-black/50 px-2 py-1 rounded backdrop-blur-sm opacity-70 hover:opacity-100 transition-opacity">
          {photographer && unsplashUsername ? (
            <a
              href={`https://unsplash.com/@${unsplashUsername}?utm_source=travel_planner&utm_medium=referral`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {photographer} / Unsplash
            </a>
          ) : (
            <a
              href="https://unsplash.com?utm_source=travel_planner&utm_medium=referral"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Unsplash
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default UnsplashImage;
