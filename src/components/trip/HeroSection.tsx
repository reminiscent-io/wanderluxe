
import React from 'react';
import { format, parseISO } from 'date-fns';
import UnsplashImage from '@/components/UnsplashImage';

interface HeroSectionProps {
  title: string;
  imageUrl: string;
  events?: any[];
  arrivalDate?: string | null;
  departureDate?: string | null;
  photographer?: string;
  unsplashUsername?: string;
  isLoading?: boolean;
}

const HeroSection: React.FC<HeroSectionProps> = ({
  title,
  imageUrl,
  arrivalDate,
  departureDate,
  photographer,
  unsplashUsername,
  isLoading = false
}) => {
  // Cache formatted date string using useMemo to prevent unnecessary recalculations
  const formattedDateRange = React.useMemo(() => {
    if (arrivalDate && departureDate) {
      const arrival = parseISO(arrivalDate);
      const departure = parseISO(departureDate);
      return `${format(arrival, 'MMMM do, yyyy')} - ${format(departure, 'MMMM do, yyyy')}`;
    }
    return null;
  }, [arrivalDate, departureDate]);

  // If loading, show skeleton UI
  if (isLoading) {
    return (
      <div className="relative w-full h-full bg-gray-200 animate-pulse">
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
          <div className="w-1/2 h-12 bg-gray-300 rounded mb-4"></div>
          <div className="w-1/3 h-6 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ height: '500px' }}>
      {/* Image container with fixed height - lowest z-index */}
      <div className="absolute inset-0 w-full h-full -z-10">
        {photographer && unsplashUsername ? (
          <div className="relative h-full">
            <UnsplashImage 
              src={imageUrl} 
              alt={title || 'Trip cover image'} 
              className="w-full h-full object-cover object-center" 
            />
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/60 text-white text-xs">
              Photo by{' '}
              <a 
                href={`https://unsplash.com/@${unsplashUsername}?utm_source=traveler_app&utm_medium=referral`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="underline hover:text-gray-200"
              >
                {photographer}
              </a>
              {' '}on{' '}
              <a 
                href="https://unsplash.com?utm_source=traveler_app&utm_medium=referral" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="underline hover:text-gray-200"
              >
                Unsplash
              </a>
            </div>
          </div>
        ) : (
          <UnsplashImage 
            src={imageUrl} 
            alt={title || 'Trip cover image'} 
            className="w-full h-full object-cover object-center" 
          />
        )}
      </div>

      {/* Dark overlay - middle z-index */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60 -z-5" />

      {/* Content container - highest z-index */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 z-0">
        <div className="max-w-4xl w-full text-center">
          <h1 className="text-6xl font-bold text-white mb-6 leading-tight">
            {title}
          </h1>
          {formattedDateRange && (
            <div className="inline-block rounded-lg backdrop-blur-sm bg-[#000a00]/0 px-[10px] py-px">
              <p className="text-2xl text-white font-medium">
                {formattedDateRange}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(HeroSection);
