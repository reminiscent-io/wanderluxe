
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
    const extractPhotoId = (url: string): string | null => {
      try {
        const urlObj = new URL(url);
        
        // Handle different Unsplash URL formats
        if (urlObj.hostname === 'unsplash.com') {
          // Format: https://unsplash.com/photos/{id}
          const matches = urlObj.pathname.match(/\/photos\/([^/?]+)/);
          return matches?.[1] || null;
        } else if (urlObj.hostname === 'images.unsplash.com') {
          // Format: https://images.unsplash.com/photo-{id}
          const segments = urlObj.pathname.split('/');
          const photoSegment = segments.find(s => s.startsWith('photo-'));
          return photoSegment ? photoSegment.replace('photo-', '') : null;
        }
        return null;
      } catch (e) {
        console.error('Error parsing URL:', e);
        return null;
      }
    };

    const fetchMetadata = async () => {
      try {
        const photoId = extractPhotoId(url);
        console.log('Extracted photo ID:', photoId); // Debug log

        if (!photoId) {
          throw new Error('Could not extract photo ID from URL: ' + url);
        }

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
        // Fallback to direct URL if metadata fetch fails
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
