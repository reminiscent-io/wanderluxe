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

interface DateRangeDisplayProps {
  isLoading: boolean;
  formattedDateRange: string | null;
}

const DateRangeDisplay: React.FC<DateRangeDisplayProps> = ({
  isLoading,
  formattedDateRange
}) => {
  if (isLoading) {
    return <div className="h-6 w-64 bg-gray-300/30 animate-pulse rounded"></div>;
  }

  if (formattedDateRange) {
    return <p className="text-lg md:text-xl font-medium drop-shadow-md text-center">{formattedDateRange}</p>;
  }

  return <p className="text-lg md:text-xl font-medium drop-shadow-md opacity-75 text-center">Dates not set</p>;
};


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

  // State to remember the last valid destination (title)
  const [lastValidTitle, setLastValidTitle] = React.useState(title);

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

  React.useEffect(() => {
    // Update the destination only if the title is non-empty
    if (title && title.trim() !== '') {
      setLastValidTitle(title);
    }
  }, [title]);

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
    <div className="relative w-full mb-0">
      <div className="relative aspect-[21/13.5] w-full overflow-hidden rounded-lg rounded-b-none">
        {imageUrl ? (
          <UnsplashImage
            src={imageUrl}
            alt={lastValidTitle}
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
        <div className="absolute inset-0 flex flex-col items-center justify-center p-10 md:p-16 text-white z-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg text-center">
            {isLoading ? (
              <div className="h-10 w-48 bg-gray-300/30 animate-pulse rounded"></div>
            ) : (
              lastValidTitle
            )}
          </h1>

          <DateRangeDisplay 
            isLoading={isLoading}
            formattedDateRange={formattedDateRange}
          />
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
