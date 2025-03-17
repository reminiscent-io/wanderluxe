import React from 'react';
import { Link } from 'react-router-dom';
import LogoFromSupabase from '@/components/LogoFromSupabase';

export const NavigationLogo: React.FC<{isScrolled?: boolean}> = ({ isScrolled }) => {
  return (
    <Link to="/" className="flex items-center">
      <LogoFromSupabase 
        logoName={isScrolled ? "Sand Simple" : "White Simple"}
        className="h-8 object-contain"
        fallbackClassName={`text-xl font-bold ${isScrolled ? "text-earth-500" : "text-white"}`}
      />
    </Link>
  );
};

export default NavigationLogo;