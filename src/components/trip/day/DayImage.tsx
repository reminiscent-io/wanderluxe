import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface DayImageProps {
  dayId: string;
  title?: string;
  imageUrl?: string | null;
  defaultImageUrl?: string;
  className?: string;
  objectPosition?: string;
}

const DayImage: React.FC<DayImageProps> = ({
  dayId,
  title,
  imageUrl,
  defaultImageUrl,
  className,
  objectPosition = "center 50%",
  ...props // handle any other props passed to the component
}) => {
  const displayImageUrl =
    imageUrl || 'https://images.unsplash.com/photo-1578894381163-e72c17f2d45f';
    
  const [imagePosition, setImagePosition] = useState(objectPosition);
  
  // Load image position from localStorage when component mounts
  useEffect(() => {
    const savedPosition = localStorage.getItem(`day_image_position_${dayId}`);
    if (savedPosition) {
      setImagePosition(savedPosition);
    }
  }, [dayId]);

  return (
    <div className={cn('relative w-full bg-gray-200', className)} {...props}>
      {displayImageUrl ? (
        <div className="relative overflow-hidden rounded-lg w-full h-full">
          {title && (
            <div className="absolute top-0 left-0 z-10 p-2">
              <h2 className="text-white text-xl font-bold drop-shadow-lg">
                {title}
              </h2>
            </div>
          )}
          <img
            src={displayImageUrl}
            alt={title || 'Day image'}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: imagePosition, objectFit: "cover" }}
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
