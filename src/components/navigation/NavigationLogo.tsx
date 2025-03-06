import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchLogosFromSupabase } from '@/utils/storageUtils';

export const NavigationLogo: React.FC<{isScrolled?: boolean}> = ({ isScrolled }) => {
  const [logo, setLogo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLogo = async () => {
      try {
        const logos = await fetchLogosFromSupabase();
        // Specifically look for the black simple logo
        const blackSimpleLogo = logos.find(l => 
          l.name.toLowerCase().includes('simple') && 
          l.name.toLowerCase().includes('black')
        );
        // Default to any logo if black simple logo is not found
        setLogo(blackSimpleLogo?.url || (logos.length > 0 ? logos[0].url : null));
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
        <span className={`text-xl font-bold ${
          isScrolled ? "text-earth-500" : "text-white"
        }`}>
          WanderLuxe
        </span>
      )}
    </Link>
  );
};

export default NavigationLogo;