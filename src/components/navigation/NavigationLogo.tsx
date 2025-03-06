
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchLogosFromSupabase, Logo } from '@/utils/storageUtils';

export const NavigationLogo: React.FC = () => {
  const [logo, setLogo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLogo = async () => {
      try {
        const logos = await fetchLogosFromSupabase();
        // Look for full logo variants first
        const fullLogo = logos.find(l => l.name.includes('full'));
        // Default to any logo if no full logo is found
        setLogo(fullLogo?.url || (logos.length > 0 ? logos[0].url : null));
      } catch (error) {
        console.error('Failed to load logo:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLogo();
  }, []);

  return (
    <Link to="/" className="flex items-center">
      {isLoading ? (
        <div className="h-8 w-32 bg-gray-200 animate-pulse rounded"></div>
      ) : logo ? (
        <img 
          src={logo} 
          alt="WanderLuxe Logo" 
          className="h-8 object-contain"
        />
      ) : (
        <span className="text-xl font-bold">WanderLuxe</span>
      )}
    </Link>
  );
};

export default NavigationLogo;
