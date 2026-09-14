
import React, { useEffect, useState } from 'react';
import { fetchLogosFromSupabase } from '@/utils/storageUtils';

interface LogoFromSupabaseProps {
  logoName: string;
  className?: string;
  fallbackText?: string;
  fallbackClassName?: string;
}

// Known logos, with each PNG's pixel size. They render on the first pass with
// their aspect ratio reserved, so the box has its final size before the image
// decodes. Without it the header logo grew from 0 to 190px wide and slid the
// nav links across, and the hero wordmark pushed the headline up by 150px.
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
