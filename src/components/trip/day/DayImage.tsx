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
  className,
  ...props // Added to handle any other props passed to the component
}) => {
  const displayImageUrl = imageUrl || 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?'; //Default image on dayCard

  console.log('DayImage rendering:', {
    dayId,
    title,
    imageUrl: imageUrl || 'undefined/null',
    defaultImageUrl: defaultImageUrl || 'undefined/null',
    displayImageUrl: displayImageUrl || defaultImageUrl,
    usingDefault: !imageUrl && !!defaultImageUrl
  });

  return (
    <div className={cn('relative w-full bg-gray-200', className)} {...props}> 
      {displayImageUrl ? (
        <div className="relative overflow-hidden">
          <img
            src={displayImageUrl}
            alt={title || 'Day image'}
            className="w-full h-auto"
            onError={(e) => {
              console.error('Image failed to load:', displayImageUrl);
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      ) : (
        <div className="flex items-center justify-center text-gray-400 h-[400px]">
          No image available
        </div>
      )}
    </div>
  );
};

export default DayImage;