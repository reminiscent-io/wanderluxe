
import React, { useEffect, useState } from 'react';
import { fetchLogosFromSupabase } from '@/utils/storageUtils';

interface LogoFromSupabaseProps {
  logoName: string;
  className?: string;
  fallbackText?: string;
  fallbackClassName?: string;
}

// Logos with a known storage URL, and each PNG's pixel size. The size becomes
// the <img>'s aspect-ratio so its box is reserved before the file arrives:
// without it the logo lays out at zero height, and its full height (300px in
// the landing hero) lands as a layout shift once the image loads.
const DIRECT_LOGOS: Record<string, { url: string; width: number; height: number }> = {
  "Black Full": { url: "https://arnengxblsfnezrqcsxw.supabase.co/storage/v1/object/public/logos/Black%20Full_v2.png", width: 1563, height: 1563 },
  "Black Simple": { url: "https://arnengxblsfnezrqcsxw.supabase.co/storage/v1/object/public/logos/Black%20Simple.png", width: 1418, height: 237 },
  "White Full": { url: "https://arnengxblsfnezrqcsxw.supabase.co/storage/v1/object/public/logos/White%20Full.png", width: 1563, height: 1563 },
  "White Simple": { url: "https://arnengxblsfnezrqcsxw.supabase.co/storage/v1/object/public/logos/White%20Simple.png", width: 1431, height: 240 },
  "Sand Simple": { url: "https://arnengxblsfnezrqcsxw.supabase.co/storage/v1/object/public/logos/Sand%20Simple.png", width: 1416, height: 238 },
};

const LogoFromSupabase: React.FC<LogoFromSupabaseProps> = ({
  logoName,
  className = "h-10 object-contain",
  fallbackText = "WanderLuxe",
  fallbackClassName = "text-xl font-bold"
}) => {
  const direct = DIRECT_LOGOS[logoName];
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!direct);

  useEffect(() => {
    // Known logos render on the first pass below; only other names are looked up.
    if (DIRECT_LOGOS[logoName]) return;

    const loadLogo = async () => {
      try {
        const logos = await fetchLogosFromSupabase();
        console.log("Available logos:", logos.map(l => l.name)); // Debugging
        
        // Try exact match with dashes, then partial match
        const exactMatch = logos.find(l => 
          l.name.toLowerCase() === `wanderluxe-${logoName.toLowerCase()}.png` ||
          l.name.toLowerCase() === `${logoName.toLowerCase()}.png`
        );
        
        const partialMatch = logos.find(l => 
          l.name.toLowerCase().includes(logoName.toLowerCase())
        );
        
        setLogoUrl(exactMatch?.url || partialMatch?.url || null);
        
        if (!exactMatch && !partialMatch) {
          console.warn(`No logo found matching "${logoName}"`);
        }
      } catch (error) {
        console.error('Failed to load logo:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLogo();
  }, [logoName]);

  if (direct) {
    return (
      <img
        src={direct.url}
        alt="WanderLuxe Logo"
        className={className}
        style={{ aspectRatio: `${direct.width} / ${direct.height}` }}
      />
    );
  }

  if (isLoading) {
    return <div className={`bg-sand-200 animate-pulse ${className}`}></div>;
  }

  if (!logoUrl) {
    return <span className={fallbackClassName}>{fallbackText}</span>;
  }

  return (
    <img 
      src={logoUrl} 
      alt="WanderLuxe Logo" 
      className={className}
    />
  );
};

export default LogoFromSupabase;
