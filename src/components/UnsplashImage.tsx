
import React, { useEffect, useState } from 'react';

interface UnsplashImageProps {
  url: string;
  className?: string;
  showAttribution?: boolean;
}

interface UnsplashMetadata {
  src: string;
  alt: string;
  photographer: string;
  photographerUrl: string;
  unsplashUrl: string;
}

const UnsplashImage: React.FC<UnsplashImageProps> = ({ 
  url, 
  className = "",
  showAttribution = true
}) => {
  const [metadata, setMetadata] = useState<UnsplashMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        let photoId;
        if (url.includes('unsplash.com/photos/')) {
          photoId = url.split('/').pop()?.split('?')[0];
        } else if (url.includes('images.unsplash.com')) {
          photoId = url.split('/')[3].split('?')[0];
        }

        if (photoId && photoId.startsWith('photo-')) {
          photoId = photoId.replace('photo-', '');
        }

        if (!photoId) {
          throw new Error('Invalid Unsplash URL');
        }

        // Track the view of the photo
        const trackResponse = await fetch(`https://api.unsplash.com/photos/${photoId}/download`, {
          headers: {
            Authorization: `Client-ID ${import.meta.env.VITE_UNSPLASH_ACCESS_KEY}`,
          },
        });

        const response = await fetch(`https://api.unsplash.com/photos/${photoId}`, {
          headers: {
            Authorization: `Client-ID ${import.meta.env.VITE_UNSPLASH_ACCESS_KEY}`,
          },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Construct optimized image URL with dynamic resizing
        const width = 1200; // Default width, adjust based on your needs
        const optimizedUrl = new URL(data.urls.raw);
        optimizedUrl.searchParams.set('w', width.toString());
        optimizedUrl.searchParams.set('q', '80');
        optimizedUrl.searchParams.set('fm', 'webp');
        optimizedUrl.searchParams.set('auto', 'compress');

        setMetadata({
          src: optimizedUrl.toString(),
          alt: data.alt_description || 'Unsplash Image',
          photographer: data.user.name,
          photographerUrl: data.user.links.html,
          unsplashUrl: data.links.html,
        });
      } catch (error) {
        console.error('Error fetching Unsplash metadata:', error);
        setError('Failed to load image metadata');
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

  if (error) {
    console.error(error);
  }

  if (!metadata) return null;

  const utmParams = '?utm_source=travel_planner&utm_medium=referral';

  return (
    <div className="relative overflow-hidden">
      <img
        src={metadata.src}
        alt={metadata.alt}
        className={className}
      />
      {showAttribution && (
        <a
          href={`${metadata.unsplashUrl}${utmParams}`}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-4 right-4 text-white text-sm bg-black/50 px-2 py-1 rounded backdrop-blur-sm opacity-70 hover:opacity-100 transition-opacity"
        >
          Photo by{' '}
          <a
            href={`${metadata.photographerUrl}${utmParams}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            {metadata.photographer}
          </a>
          {' '}on{' '}
          <a
            href={`https://unsplash.com${utmParams}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Unsplash
          </a>
        </a>
      )}
    </div>
  );
};

export default UnsplashImage;
