
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
  // Add debug logging
  console.log('HeroSection rendering with:', {
    title,
    imageUrl,
    arrivalDate,
    departureDate
  });

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
      {/* Main hero container with debug border */}
      <div className="absolute inset-0 h-[40vh] min-h-[300px] w-full z-10 border-4 border-transparent">
        {photographer && unsplashUsername ? (
          <div className="relative h-full">
            <UnsplashImage
              src={imageUrl}
              alt={title || 'Trip cover image'}
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
          <UnsplashImage
            src={imageUrl}
            alt={title || 'Trip cover image'}
            className="w-full h-full object-cover"
          />
        )}
        {/* Gradient overlay with debug class */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/60 z-20" />
      </div>
      {/* Title container with debug border */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center z-30 border-4 border-transparent">
        <h1 className="text-5xl font-bold mb-4 px-4 py-2 bg-black/20 rounded">
          {title || 'No Title Available'}
        </h1>
        {formatDateRange() && (
          <p className="text-xl px-4 py-2 bg-black/20 rounded">
            {formatDateRange()}
          </p>
        )}
      </div>
    </div>
  );
};

export default HeroSection;
