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
  // State to remember the last valid dates
  const [lastValidDates, setLastValidDates] = React.useState({
    arrivalDate,
    departureDate,
  });

  React.useEffect(() => {
    // Update only if both dates are valid and non-empty
    if (
      arrivalDate &&
      departureDate &&
      arrivalDate.trim() !== '' &&
      departureDate.trim() !== ''
    ) {
      setLastValidDates({ arrivalDate, departureDate });
    }
  }, [arrivalDate, departureDate]);

  // Compute formatted date range using the last valid dates
  const formattedDateRange = React.useMemo(() => {
    const safeArrival = lastValidDates.arrivalDate;
    const safeDeparture = lastValidDates.departureDate;

    if (!safeArrival || !safeDeparture) {
      console.log('Missing or invalid date information for formatting', { arrivalDate: safeArrival, departureDate: safeDeparture });
      return null;
    }

    try {
      const start = parseISO(safeArrival);
      const end = parseISO(safeDeparture);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.log('Invalid date objects after parsing');
        return null;
      }

      const formattedStart = format(start, 'LLL d, yyyy');
      const formattedEnd = format(end, 'LLL d, yyyy');
      return `${formattedStart} - ${formattedEnd}`;
    } catch (error) {
      console.error('Error formatting dates:', error);
      return null;
    }
  }, [lastValidDates]);

  console.log('HeroSection rendering with:', { formattedDateRange });

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

        {/* Title and date overlay - centered */}
        <div className="absolute inset-0 flex flex-col items-start justify-center p-4 md:p-6 text-white z-10">
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
