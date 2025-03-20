
import React from 'react';
import { cn } from '@/lib/utils';

interface DayImageProps {
  dayId: string;
  title?: string;
  imageUrl?: string | null;
  defaultImageUrl?: string;
  className?: string;
}

const DayImage: React.FC<DayImageProps> = ({
  dayId,
  title,
  imageUrl,
  defaultImageUrl,
  className
}) => {
  // Use the provided image URL or fallback to defaultImageUrl
  const displayImageUrl = imageUrl || defaultImageUrl;
  
  // For debugging
  console.log('DayImage rendering:', {
    dayId,
    title,
    imageUrl,
    defaultImageUrl,
    displayImageUrl
  });

  return (
    <div className={cn('relative w-full h-full bg-black', className)}>
      {displayImageUrl ? (
        <img
          src={displayImageUrl}
          alt={title || 'Day image'}
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            console.error('Image failed to load:', displayImageUrl);
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
          No Image Selected
        </div>
      )}
    </div>
  );
};

export default DayImage;
