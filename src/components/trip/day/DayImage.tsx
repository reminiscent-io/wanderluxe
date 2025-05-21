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
    
  // Initialize with provided objectPosition, but prefer localStorage value if available
  const [imagePosition, setImagePosition] = useState(objectPosition);
  
  // Load image position from database or localStorage when component mounts or when dayId changes
  useEffect(() => {
    const loadImagePosition = async () => {
      try {
        // Try to get position from database first
        const { data, error } = await supabase
          .from('trip_days')
          .select('image_position')
          .eq('day_id', dayId)
          .single();
        
        if (!error && data && data.image_position) {
          console.log(`DayImage: Loaded position from DB for day ${dayId}:`, data.image_position);
          setImagePosition(data.image_position);
          
          // Also update localStorage for quick access
          localStorage.setItem(`day_image_position_${dayId}`, data.image_position);
        } else {
          // Fallback to localStorage if data not in DB
          const savedPosition = localStorage.getItem(`day_image_position_${dayId}`);
          if (savedPosition) {
            console.log(`DayImage: Loaded position from localStorage for day ${dayId}:`, savedPosition);
            setImagePosition(savedPosition);
          }
        }
        
        // Force a layout recalculation to apply the new position
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
        }, 10);
      } catch (err) {
        console.error('Error loading image position:', err);
      }
    };
    
    loadImagePosition();
  }, [dayId]);
  
  // Update position when objectPosition prop changes
  useEffect(() => {
    if (objectPosition && objectPosition !== "center 50%") {
      console.log(`DayImage: Updated from prop - day ${dayId}:`, objectPosition);
      setImagePosition(objectPosition);
      
      // Force a re-render to apply the position
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 50);
    }
  }, [objectPosition, dayId]);

  return (
    <div className={cn('relative w-full bg-gray-200 h-full', className)} {...props}>
      {displayImageUrl ? (
        <div className="relative overflow-hidden rounded-lg w-full h-full">
          {title && (
            <div className="absolute top-0 left-0 z-10 p-2">
              <h2 className="text-white text-xl font-bold drop-shadow-lg">
                {title}
              </h2>
            </div>
          )}
          {/* Force image to respect the vertical position by removing any conflicting styles */}
          <div className="absolute inset-0 w-full h-full overflow-hidden">
            <img
              src={displayImageUrl}
              alt={title || 'Day image'}
              className="absolute w-full h-full object-cover"
              style={{ 
                objectPosition: imagePosition,
                transform: 'translate3d(0, 0, 0)', /* Force hardware acceleration */
                width: '100%',
                height: '100%',
                transition: 'object-position 0.2s ease-out' /* Add smooth transition */
              }}
              onLoad={(e) => {
                // Force the browser to recognize the image position by briefly changing a property
                const img = e.currentTarget;
                const originalOpacity = img.style.opacity;
                img.style.opacity = '0.99';
                setTimeout(() => {
                  img.style.opacity = originalOpacity;
                }, 50);
              }}
              onError={(e) => {
                console.error('Image failed to load:', displayImageUrl);
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
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
