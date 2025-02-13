import React, { useEffect, useState } from 'react';

interface UnsplashImageProps {
  url: string;
  className?: string;
}

interface UnsplashMetadata {
  src: string;
  alt: string;
  photographer: string;
  photographerUrl: string;
  unsplashUrl: string;
  downloadLocation: string;
}

const UnsplashImage: React.FC<UnsplashImageProps> = ({ url, className = "" }) => {
  const [metadata, setMetadata] = useState<UnsplashMetadata | null>(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const response = await fetch(`https://api.unsplash.com/photos/${url.split('/').pop()}`, {
          headers: {
            Authorization: `Client-ID ${import.meta.env.VITE_UNSPLASH_ACCESS_KEY}`,
          },
        });
        const data = await response.json();
        setMetadata({
          src: data.urls.regular,
          alt: data.alt_description || 'Unsplash Image',
          photographer: data.user.name,
          photographerUrl: data.user.links.html,
          unsplashUrl: data.links.html,
          downloadLocation: data.links.download_location,
        });
      } catch (error) {
        console.error('Error fetching Unsplash metadata:', error);
      }
    };

    fetchMetadata();
  }, [url]);

  const handleImageClick = async () => {
    if (metadata?.downloadLocation) {
      try {
        await fetch(metadata.downloadLocation, {
          headers: {
            Authorization: `Client-ID ${import.meta.env.VITE_UNSPLASH_ACCESS_KEY}`,
          },
        });
      } catch (error) {
        console.error('Error tracking download:', error);
      }
    }
  };

  if (!metadata) return null;

  return (
    <div className="relative">
      <img
        src={metadata.src}
        alt={metadata.alt}
        className={className}
        onClick={handleImageClick}
      />
      <a
        href={metadata.unsplashUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-4 right-4 text-white text-sm opacity-70 hover:opacity-100"
      >
        Photo by <a href={metadata.photographerUrl} target="_blank" rel="noopener noreferrer">{metadata.photographer}</a> on Unsplash
      </a>
    </div>
  );
};

export default UnsplashImage;
