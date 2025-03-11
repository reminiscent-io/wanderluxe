import React from 'react';
import { format, parseISO } from 'date-fns';
import UnsplashImage from '@/components/UnsplashImage';

interface HeroSectionProps {
  title: string;
  imageUrl: string;
  arrivalDate: string | null;
  departureDate: string | null;
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
  isLoading = false,
}) => {
  // Format the date range string when both dates are available
  const formattedDateRange = React.useMemo(() => {
    if (!arrivalDate || !departureDate) {
      console.log('Missing date information for formatting', { arrivalDate, departureDate });
      return null;
    }

    try {
      // Additional validation to prevent errors with invalid dates
      if (typeof arrivalDate !== 'string' || typeof departureDate !== 'string') {
        console.error('Invalid date types:', { 
          arrivalType: typeof arrivalDate, 
          departureType: typeof departureDate 
        });
        return null;
      }

      if (!arrivalDate.match(/^\d{4}-\d{2}-\d{2}/) || !departureDate.match(/^\d{4}-\d{2}-\d{2}/)) {
        console.error('Invalid date format:', { arrivalDate, departureDate });
        return null;
      }

      const arrivalISO = parseISO(arrivalDate);
      const departureISO = parseISO(departureDate);

      // Check if dates parsed successfully
      if (isNaN(arrivalISO.getTime()) || isNaN(departureISO.getTime())) {
        console.error('Dates could not be parsed:', { arrivalDate, departureDate });
        return null;
      }

      return `${format(arrivalISO, 'MMM d')} - ${format(departureISO, 'MMM d, yyyy')}`;
    } catch (error) {
      console.error('Error formatting date range:', error);
      return null;
    }
  }, [arrivalDate, departureDate]);

  // Debug render - helps trace the lifecycle
  console.log('HeroSection rendering with:', { 
    title, 
    imageUrl: imageUrl ? 'has image' : 'no image',
    arrivalDate, 
    departureDate,
    formattedDateRange 
  });

  return (
    <div className="relative w-full">
      <div className="relative aspect-[21/9] w-full overflow-hidden rounded-lg">
        {imageUrl ? (
          <UnsplashImage
            src={imageUrl}
            alt={title}
            className="h-full w-full object-cover"
            photographer={photographer}
            unsplashUsername={unsplashUsername}
          />
        ) : (
          <div className="h-full w-full bg-gray-200 animate-pulse"></div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

        {/* Title and date overlay */}
        <div className="absolute bottom-0 left-0 p-4 md:p-6 text-white z-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 drop-shadow-md">
            {isLoading ? (
              <div className="h-10 w-48 bg-gray-300/30 animate-pulse rounded"></div>
            ) : (
              title
            )}
          </h1>

          {isLoading ? (
            <div className="h-6 w-64 bg-gray-300/30 animate-pulse rounded"></div>
          ) : formattedDateRange ? (
            <p className="text-lg md:text-xl font-medium drop-shadow-md">{formattedDateRange}</p>
          ) : (
            <p className="text-lg md:text-xl font-medium drop-shadow-md opacity-75">Dates not set</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeroSection;