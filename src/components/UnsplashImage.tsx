
import React, { useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";

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

        // Track the view and fetch metadata through the Edge Function
        const { data, error } = await supabase.functions.invoke('fetch-unsplash-metadata', {
          body: { photoId }
        });

        if (error) throw error;

        if (!data) {
          throw new Error('Failed to fetch image metadata');
        }

        setMetadata({
          src: data.optimizedUrl,
          alt: data.alt_description || 'Unsplash Image',
          photographer: data.photographer,
          photographerUrl: data.photographerUrl,
          unsplashUrl: data.unsplashUrl,
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

