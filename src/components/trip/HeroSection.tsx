import React from 'react';
import { format, getYear } from 'date-fns';

interface HeroSectionProps {
  title: string;
  date: string;
  imageUrl: string;
  events?: { date: string }[];
}

const HeroSection = ({ title, date, imageUrl, events = [] }: HeroSectionProps) => {
  const formatDateRange = (dateString: string) => {
    const [startDate] = dateString.split(' - ').map(d => new Date(d));
    
    // Find the last event date
    let endDate = startDate;
    if (events.length > 0) {
      const lastEvent = events[events.length - 1];
      endDate = new Date(lastEvent.date);
    }

    const startYear = getYear(startDate);
    const endYear = getYear(endDate);

    if (startYear === endYear) {
      return `${format(startDate, "MMMM do")} - ${format(endDate, "MMMM do yyyy")}`;
    }
    
    return `${format(startDate, "MMMM do yyyy")} - ${format(endDate, "MMMM do yyyy")}`;
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