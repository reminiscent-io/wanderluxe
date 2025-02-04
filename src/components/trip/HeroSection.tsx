import React from 'react';
import { format } from 'date-fns';

interface HeroSectionProps {
  title: string;
  date: string;
  imageUrl: string;
  events?: { date: string }[];
  arrivalDate?: string | null;
  departureDate?: string | null;
}

const HeroSection: React.FC<HeroSectionProps> = ({
  title,
  imageUrl,
  arrivalDate,
  departureDate,
}) => {
  const formatDateRange = () => {
    if (arrivalDate && departureDate) {
      const arrival = new Date(arrivalDate);
      const departure = new Date(departureDate);
      return `${format(arrival, 'MMMM do, yyyy')} - ${format(departure, 'MMMM do, yyyy')}`;
    }
    return null;
  };

  return (
    <div className="relative h-[60vh] min-h-[400px] w-full">
      <div className="absolute inset-0">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
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