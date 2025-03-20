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
  const displayImageUrl = imageUrl || defaultImageUrl;

  return (
    <div className={cn('relative w-full h-full', className)}>
      {displayImageUrl ? (
        <img
          src={displayImageUrl}
          alt={title || 'Day image'}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gray-200" />
      )}
    </div>
  );
};

export default DayImage;