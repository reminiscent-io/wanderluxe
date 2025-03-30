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
  ...props // handle any other props passed to the component
}) => {
  const displayImageUrl =
    imageUrl || 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?';

  return (
    <div className={cn('relative w-full bg-gray-200', className)} {...props}>
      {displayImageUrl ? (
        <div className="relative overflow-hidden rounded-lg w-full"> {/*Removed fixed height here*/}
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