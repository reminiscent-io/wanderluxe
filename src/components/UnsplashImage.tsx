import React from 'react';

interface UnsplashImageProps {
  src: string;
  alt: string;
  photographer: string;
  photographerUrl: string;
  unsplashUrl: string;
  className?: string;
  downloadLocation?: string;
}

const UnsplashImage: React.FC<UnsplashImageProps> = ({
  src,
  alt,
  photographer,
  photographerUrl,
  unsplashUrl,
  className = "",
  downloadLocation,
}) => {
  const handleImageClick = async () => {
    if (downloadLocation) {
      try {
        await fetch(downloadLocation, {
          headers: {
            Authorization: `Client-ID ${import.meta.env.VITE_UNSPLASH_ACCESS_KEY}`,
          },
        });
      } catch (error) {
        console.error('Error tracking download:', error);
      }
    }
  };

  return (
    <div className="relative">
      <img
        src={src}
        alt={alt}
        className={className}
        onClick={handleImageClick}
      />
      <a
        href={unsplashUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-4 right-4 text-white text-sm opacity-70 hover:opacity-100"
      >
        Photo by <a href={photographerUrl} target="_blank" rel="noopener noreferrer">{photographer}</a> on Unsplash
      </a>
    </div>
  );
};

export default UnsplashImage;
