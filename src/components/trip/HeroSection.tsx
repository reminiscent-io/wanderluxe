
import React from 'react';
import { format, parseISO } from 'date-fns';
import UnsplashImage from '@/components/UnsplashImage';

interface HeroSectionProps {
  title: string;
  date: string;
  imageUrl: string;
  events?: any[]; // Remove specific type requirement since we don't use it
  arrivalDate?: string | null;
  departureDate?: string | null;
  photographer?: string;
  unsplashUsername?: string;
}

const HeroSection: React.FC<HeroSectionProps> = ({
  title,
  imageUrl,
  arrivalDate,
  departureDate,
  photographer,
  unsplashUsername,
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
    // Added pt-16 to account for navigation height
    <div className="relative h-[40vh] min-h-[300px] w-full pt-16">
      <div className="absolute inset-0 h-full w-full">
        {photographer && unsplashUsername ? (
          <div className="relative h-full">
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover"
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
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/60" />
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center z-40">
        <h1 className="text-5xl font-bold mb-4">{title}</h1>
        {formatDateRange() && (
          <p className="text-xl">{formatDateRange()}</p>
        )}
      </div>
    </div>
  );
};

export default HeroSection;
