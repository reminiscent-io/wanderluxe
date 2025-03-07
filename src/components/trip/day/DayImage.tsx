
import React from 'react';
import UnsplashImage from '@/components/UnsplashImage';

export interface DayImageProps {
  dayId: string;
  title: string;
  imageUrl?: string | null;
  defaultImageUrl?: string;
}

// Helper function to extract photographer info from Unsplash URL
const extractPhotographerFromUrl = (url: string): string => {
  try {
    // Try to extract user info from Unsplash URL pattern
    // Unsplash URLs sometimes contain user information in the query parameters
    const urlObj = new URL(url);
    const user = urlObj.searchParams.get('user');
    if (user) return user;
    
    // If using the Unsplash API directly, photo IDs may be in the path
    // Example URL format: https://images.unsplash.com/photo-{id}?...
    const pathMatch = urlObj.pathname.match(/photo-([a-zA-Z0-9-]+)/);
    if (pathMatch) {
      // In a production app, you'd make an API call to get photographer name
      // Using photo ID from pathMatch[1]
      // For now, just display "Unsplash Photographer"
      return "Unsplash Photographer";
    }
    
    return "Unsplash Photographer";
  } catch (e) {
    console.error("Error parsing Unsplash URL", e);
    return "Unsplash Photographer";
  }
}

const DayImage: React.FC<DayImageProps> = ({ 
  dayId, 
  title, 
  imageUrl,
  defaultImageUrl 
}) => {
  // Use the day's specific image if available, otherwise fallback to trip's default image
  const displayImageUrl = imageUrl || defaultImageUrl;

  console.log('DayImage rendering with:', {
    dayId,
    title,
    imageUrl,
    defaultImageUrl,
    displayImageUrl
  });

  if (!displayImageUrl) {
    return (
      <div className="relative h-[300px] overflow-hidden rounded-l-lg bg-gray-100">
        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
          No image selected
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
          <h2 className="text-white text-xl font-bold drop-shadow-lg">
            {title || "Untitled Day"}
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[300px] overflow-hidden rounded-l-lg">
      <UnsplashImage
        src={displayImageUrl}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        alt={title || "Day Image"}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <h2 className="text-white text-2xl font-bold drop-shadow-lg">
          {title || "Untitled Day"}
        </h2>
        {displayImageUrl && displayImageUrl.includes('unsplash.com') && (
          <div className="text-white text-xs opacity-70 mt-1">
            <a 
              href={`https://unsplash.com/?utm_source=wanderluxe&utm_medium=referral`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              Photo via Unsplash
            </a>
            {displayImageUrl.includes('ixid=') && (
              <span> by {extractPhotographerFromUrl(displayImageUrl)}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DayImage;
