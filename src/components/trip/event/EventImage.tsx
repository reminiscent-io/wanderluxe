import React, { useState } from 'react';

interface EventImageProps {
  title: string;
  imageUrl: string;
}

const EventImage: React.FC<EventImageProps> = ({ title, imageUrl }) => {
  const [imageError, setImageError] = useState(false);

  const getImageUrl = () => {
    if (imageError || !imageUrl) {
      if (title.toLowerCase().includes('naples')) {
        return "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?q=80&w=2574&auto=format&fit=crop"; 
      } else if (title.toLowerCase().includes('positano')) {
        // Using a more reliable Positano image with proper parameters
        return "https://images.unsplash.com/photo-1533606688076-b6683a5f59f1?q=80&w=2574&auto=format&fit=crop"; 
      }
      // Default to a beautiful Amalfi Coast image if no specific location matches
      return "https://images.unsplash.com/photo-1612698093158-e07ac200d44e?q=80&w=2574&auto=format&fit=crop";
    }
    return imageUrl;
  };

  return (
    <div className="h-64 md:h-auto">
      <img 
        src={getImageUrl()} 
        alt={title}
        className="w-full h-full object-cover"
        onError={() => setImageError(true)}
      />
    </div>
  );
};

export default EventImage;