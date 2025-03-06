
import React, { useEffect, useState } from 'react';
import { fetchLogosFromSupabase } from '@/utils/storageUtils';

interface LogoFromSupabaseProps {
  logoName: string;
  className?: string;
  fallbackText?: string;
  fallbackClassName?: string;
}

const LogoFromSupabase: React.FC<LogoFromSupabaseProps> = ({
  logoName,
  className = "h-10 object-contain",
  fallbackText = "WanderLuxe",
  fallbackClassName = "text-xl font-bold"
}) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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

  if (isLoading) {
    return <div className={`bg-gray-200 animate-pulse ${className}`}></div>;
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
