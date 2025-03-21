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
  
  // For debugging
  console.log('DayImage rendering:', {
    dayId,
    title,
    imageUrl: imageUrl || 'undefined/null',
    defaultImageUrl: defaultImageUrl || 'undefined/null',
    displayImageUrl: displayImageUrl || 'undefined/null',
    usingDefault: !imageUrl && !!defaultImageUrl
  });

  return (
    <div className={cn('relative w-full h-full bg-gray-200', className)}>
      {displayImageUrl && (
        <img
          src={displayImageUrl}
          alt={title || 'Day image'}
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            console.error('Image failed to load:', displayImageUrl);
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
      {!displayImageUrl && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
          No image available
        </div>
      )}
    </div>
  );
};

export default DayImage;