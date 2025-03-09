
import React from 'react';

interface UnsplashImageProps {
  imageUrl: string;
  photographer: string | null;
  unsplashUsername: string | null;
  altText?: string;
  className?: string;
}

const UnsplashImage: React.FC<UnsplashImageProps> = ({
  imageUrl,
  photographer,
  unsplashUsername,
  altText = "Unsplash image",
  className = ""
}) => {
  if (!imageUrl) return null;

  return (
    <div className={`relative ${className}`}>
      <img 
        src={imageUrl} 
        alt={altText} 
        className="w-full h-full object-cover"
      />
      {(photographer || unsplashUsername) && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-1 text-xs">
          Photo via Unsplash by {photographer || 'Unsplash Photographer'}
          {unsplashUsername && (
            <a 
              href={`https://unsplash.com/@${unsplashUsername}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline ml-1"
            >
              @{unsplashUsername}
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default UnsplashImage;
