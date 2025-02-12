
import React from 'react';

interface UnsplashImageProps {
  src: string;
  alt: string;
  photographer: string;
  className?: string;
  downloadLocation?: string;
}

const UnsplashImage: React.FC<UnsplashImageProps> = ({
  src,
  alt,
  photographer,
  className = "",
  downloadLocation,
}) => {
  // Function to trigger download tracking
  const handleImageClick = async () => {
    if (downloadLocation) {
      try {
        // Track the download with Unsplash
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
    <div className="relative group">
      <img
        src={src}
        alt={alt}
        className={`${className} w-full h-full object-cover cursor-pointer`}
        onClick={handleImageClick}
      />
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/60 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
        Photo by{' '}
        <a
          href={`https://unsplash.com/@${photographer}?utm_source=traveler_app&utm_medium=referral`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-200"
        >
          {photographer}
        </a>
        {' '}on{' '}
        <a
          href="https://unsplash.com?utm_source=traveler_app&utm_medium=referral"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-200"
        >
          Unsplash
        </a>
      </div>
    </div>
  );
};

export default UnsplashImage;
