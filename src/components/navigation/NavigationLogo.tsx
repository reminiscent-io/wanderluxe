
import React from 'react';
import { Link } from 'react-router-dom';
import LogoFromSupabase from '@/components/LogoFromSupabase';

export const NavigationLogo: React.FC = () => {
  return (
    <Link to="/" className="flex items-center">
      <LogoFromSupabase 
        logoName="Sand Simple"
        className="h-8 object-contain"
        fallbackClassName="text-xl font-bold text-earth-500"
      />
    </Link>
  );
};

export default NavigationLogo;
