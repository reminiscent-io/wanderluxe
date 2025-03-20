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
  // Fallback to a generic image if both imageUrl and defaultImageUrl are empty
  const fallbackImage = 'https://images.unsplash.com/photo-1527489377706-5bf97e608852?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80';
  const displayImageUrl = imageUrl || defaultImageUrl || fallbackImage;
  
  // For debugging
  console.log('DayImage rendering:', {
    dayId,
    title,
    imageUrl,
    defaultImageUrl,
    displayImageUrl
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