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
}

const UnsplashImage: React.FC<UnsplashImageProps> = ({ url, className = "" }) => {
  const [metadata, setMetadata] = useState<UnsplashMetadata | null>(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        let photoId;
        if (url.includes('unsplash.com/photos/')) {
          photoId = url.split('/').pop()?.split('?')[0];
        } else if (url.includes('images.unsplash.com')) {
          photoId = url.split('/')[3].split('?')[0];
        }

        if (!photoId) {
          throw new Error('Invalid Unsplash URL');
        }

        const response = await fetch(`https://api.unsplash.com/photos/${photoId}`, {
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
        });
      } catch (error) {
        console.error('Error fetching Unsplash metadata:', error);
        // Fallback to using the provided URL directly if metadata fetch fails
        setMetadata({
          src: url,
          alt: 'Unsplash Image',
          photographer: 'Unknown',
          photographerUrl: 'https://unsplash.com',
          unsplashUrl: 'https://unsplash.com',
        });
      }
    };

    fetchMetadata();
  }, [url]);

  if (!metadata) return null;

  return (
    <div className="relative">
      <img
        src={metadata.src}
        alt={metadata.alt}
        className={className}
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
