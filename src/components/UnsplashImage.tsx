
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

function isSupabaseStorageUrl(src: string): boolean {
  return src.includes('supabase.co/storage') && src.includes('trip-images');
}

async function resolveSignedUrl(src: string): Promise<string | null> {
  if (src.includes('token=')) return null;

  const pathMatch = src.match(/\/storage\/v1\/object\/(?:public|sign)\/trip-images\/(.+?)(?:\?|$)/);
  if (!pathMatch) return null;

  try {
    const { data: { signedUrl }, error } = await supabase.storage
      .from('trip-images')
      .createSignedUrl(pathMatch[1], 31536000);
    if (!error && signedUrl) return signedUrl;
  } catch (err) {
    console.error('Error getting signed URL:', err);
  }
  return null;
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

  useEffect(() => {
    const loadImage = async () => {
      if (isSupabaseStorageUrl(src)) {
        setIsSupabaseImage(true);
        const signed = await resolveSignedUrl(src);
        if (signed) {
          setImageUrl(signed);
          return;
        }
      }
      setImageUrl(src);
    };

    loadImage();
  }, [src]);
  
  return (
    <div className="relative min-h-[300px] overflow-hidden h-full w-full">
      <img
        src={imageUrl}
        alt={alt}
        className={`${className} w-full h-full object-cover absolute inset-0`}
        style={{ objectPosition, objectFit: "cover" }}
      />
      {showAttribution && !isSupabaseImage && (
        <div className="absolute bottom-4 right-4 text-white text-sm bg-black/50 px-2 py-1 rounded backdrop-blur-sm opacity-70 hover:opacity-100 transition-opacity">
          {photographer && unsplashUsername ? (
            <a
              href={`https://unsplash.com/@${unsplashUsername}?utm_source=wanderluxe&utm_medium=referral`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {photographer} / Unsplash
            </a>
          ) : (
            <a
              href="https://unsplash.com?utm_source=wanderluxe&utm_medium=referral"
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
