import React from 'react';
import { cn } from '@/lib/utils';

interface DayImageProps {
  dayId: string;
  title: string;
  imageUrl: string | null;
  defaultImageUrl?: string;
  className?: string;
  onClick?: () => void;
}

const DayImage: React.FC<DayImageProps> = ({
  dayId,
  title,
  imageUrl,
  defaultImageUrl = '',
  className,
  onClick
}) => {
  // For debugging
  console.log('DayImage rendering with:', { dayId, title, imageUrl, defaultImageUrl, displayImageUrl: imageUrl || defaultImageUrl });

  // Determine which image to display
  const displayImageUrl = imageUrl || defaultImageUrl;

  // If no image is available, show a placeholder with just the title
  if (!displayImageUrl) {
    return (
      <div 
        className={cn(
          "relative h-40 w-full bg-gray-100 rounded-t-md flex items-center justify-center",
          className
        )}
        onClick={onClick}
      >
        <div className="text-gray-500 text-center p-4">
          <p>No image selected</p>
          <p className="text-xl font-medium mt-2">{title}</p>
        </div>
      </div>
    );
  }

  // Otherwise, show the image with overlay text
  return (
    <div 
      className={cn(
        "relative h-40 w-full bg-cover bg-center rounded-t-md",
        className
      )}
      style={{ backgroundImage: `url(${displayImageUrl})` }}
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-black/30 rounded-t-md">
        <div className="absolute bottom-0 left-0 p-4 text-white">
          <h3 className="text-xl font-medium">{title}</h3>
          {imageUrl && (
            <div className="flex items-center text-sm mt-1">
              <span>Photo via Unsplash by Unsplash Photographer</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DayImage;