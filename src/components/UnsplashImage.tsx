import React from 'react';
import { cn } from '@/lib/utils';

interface UnsplashImageProps {
  src: string;
  alt?: string;
  className?: string;
  showAttribution?: boolean;
  photographer?: string;
  unsplashUsername?: string;
}

const UnsplashImage: React.FC<UnsplashImageProps> = ({
  src,
  alt = 'Unsplash image',
  className,
  showAttribution = true,
  photographer = 'Unsplash Photographer',
  unsplashUsername = 'unsplash'
}) => {
  return (
    <div className="relative w-full h-full">
      <img 
        src={src} 
        alt={alt} 
        className={cn("w-full h-full object-cover", className)} 
      />
      {showAttribution && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-1 text-white text-xs">
          <p>
            Photo via Unsplash by {photographer}
            {unsplashUsername && (
              <a 
                href={`https://unsplash.com/@${unsplashUsername}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="ml-1 underline"
                onClick={(e) => e.stopPropagation()}
              >
                @{unsplashUsername}
              </a>
            )}
          </p>
        </div>
      )}
    </div>
  );
};

export default UnsplashImage;