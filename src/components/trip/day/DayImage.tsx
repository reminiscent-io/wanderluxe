
import React from 'react';
import UnsplashImage from '@/components/UnsplashImage';

interface DayImageProps {
  dayId: string;
  tripId: string;
  title: string;
  imageUrl?: string | null;
}

const DayImage: React.FC<DayImageProps> = ({ dayId, title, imageUrl }) => {
  if (!imageUrl) {
    return (
      <div className="relative h-auto min-h-[100px] overflow-hidden rounded-l-lg bg-gray-100">
        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
          No image selected
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
          <h2 className="text-white text-xl font-bold drop-shadow-lg">
            {title}
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[300px] overflow-hidden rounded-l-lg">
      <UnsplashImage
        url={imageUrl}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <h2 className="text-white text-2xl font-bold drop-shadow-lg">
          {title}
        </h2>
      </div>
    </div>
  );
};

export default DayImage;
