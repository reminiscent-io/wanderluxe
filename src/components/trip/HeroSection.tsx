import React from 'react';
import { format } from 'date-fns';

interface HeroSectionProps {
  title: string;
  date: string;
  imageUrl: string;
}

const HeroSection = ({ title, date, imageUrl }: HeroSectionProps) => {
  const formatDateRange = (dateString: string) => {
    const [startDate, endDate] = dateString.split(' - ').map(d => new Date(d));
    return `${format(startDate, "MMMM d ''yy")} - ${format(endDate, "MMMM d ''yy")}`;
  };

  return (
    <div className="relative h-[30vh] overflow-hidden">
      <img 
        src={imageUrl}
        alt={title}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-2">{title}</h1>
          <p className="text-lg">{formatDateRange(date)}</p>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;