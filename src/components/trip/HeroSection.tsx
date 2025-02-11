
import React from 'react';
import { format, parseISO } from 'date-fns';
import UnsplashImage from '@/components/UnsplashImage';

interface HeroSectionProps {
  title: string;
  date: string;
  imageUrl: string;
  events?: { date: string }[];
  arrivalDate?: string | null;
  departureDate?: string | null;
  photographer?: string;
}

const HeroSection: React.FC<HeroSectionProps> = ({
  title,
  imageUrl,
  arrivalDate,
  departureDate,
  photographer,
}) => {
  const formatDateRange = () => {
    if (arrivalDate && departureDate) {
      const arrival = parseISO(arrivalDate);
      const departure = parseISO(departureDate);
      return `${format(arrival, 'MMMM do, yyyy')} - ${format(departure, 'MMMM do, yyyy')}`;
    }
    return null;
  };

  return (
    <div className="relative h-[40vh] min-h-[300px] w-full">
      <div className="fixed inset-0 h-[40vh] min-h-[300px] w-full">
        {photographer ? (
          <UnsplashImage
            src={imageUrl}
            alt={title}
            photographer={photographer}
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/60" />
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center">
        <h1 className="text-5xl font-bold mb-4">{title}</h1>
        {formatDateRange() && (
          <p className="text-xl">{formatDateRange()}</p>
        )}
      </div>
    </div>
  );
};

export default HeroSection;
