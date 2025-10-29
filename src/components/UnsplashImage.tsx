
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  const [imageUrl, setImageUrl] = useState(src);
  const [isSupabaseImage, setIsSupabaseImage] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const loadImage = async () => {
      // Reset states
      setImageUrl(src);
      setIsSupabaseImage(false);
      setHasError(false);
      setIsLoading(true);
      
      console.log('UnsplashImage loading:', src);
      
      // Check if this is a Supabase storage URL
      if (src.includes('supabase.co/storage') && src.includes('trip-images')) {
        setIsSupabaseImage(true);
        
        // Extract file path and get signed URL if not already signed
        if (!src.includes('token=')) {
          const pathMatch = src.match(/\/storage\/v1\/object\/(?:public|sign)\/trip-images\/(.+?)(?:\?|$)/);
          if (pathMatch) {
            try {
              const { data: { signedUrl }, error } = await supabase.storage
                .from('trip-images')
                .createSignedUrl(pathMatch[1], 31536000); // 1 year
              
              if (!error && signedUrl && isMounted) {
                setImageUrl(signedUrl);
                console.log('Got signed URL:', signedUrl);
              }
            } catch (err) {
              console.error('Error getting signed URL:', err);
            }
          }
        }
      }
    };

    loadImage();
    
    return () => {
      isMounted = false;
    };
  }, [src]);
  
  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
    console.log('✓ Image loaded:', imageUrl.substring(0, 100));
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
    console.error('✗ Image failed to load:', imageUrl.substring(0, 100));
  };

  return (
    <div className="relative min-h-[300px] overflow-hidden h-full w-full bg-gray-100">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 animate-pulse">
          <p className="text-gray-500 text-sm">Loading image...</p>
        </div>
      )}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
          <p className="text-gray-500 text-sm">Failed to load image</p>
        </div>
      )}
      <img
        src={imageUrl}
        alt={alt}
        className={`${className} w-full h-full object-cover absolute inset-0 ${isLoading || hasError ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        style={{ objectPosition, objectFit: "cover" }}
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
      {showAttribution && !isSupabaseImage && !hasError && (
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
