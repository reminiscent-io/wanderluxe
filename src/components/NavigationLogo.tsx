
import React from 'react';
import { Link } from 'react-router-dom';
import LogoFromSupabase from '@/components/LogoFromSupabase';

const NavigationLogo: React.FC = () => {
  return (
    <Link to="/" className="flex items-center">
      <LogoFromSupabase 
        logoName="Sand Simple"
        className="h-6 sm:h-8 object-contain"
        fallbackClassName="text-lg sm:text-xl font-bold text-earth-500"
        fallbackText="WanderLuxe"
      />
    </Link>
  );
};

export default NavigationLogo;
