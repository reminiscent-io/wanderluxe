import React, { useState } from 'react';

interface DayImageProps {
  title: string;
  imageUrl?: string;
}

const DayImage: React.FC<DayImageProps> = ({ title, imageUrl }) => {
  const [imageError, setImageError] = useState(false);

  const getImageUrl = () => {
    if (!imageUrl || imageError) {
      // Default images based on title keywords
      if (title.toLowerCase().includes('naples')) {
        return "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?q=80&w=2574&auto=format&fit=crop"; 
      } else if (title.toLowerCase().includes('positano')) {
        return "https://images.unsplash.com/photo-1533606688076-b6683a5f59f1?q=80&w=2574&auto=format&fit=crop"; 
      }
      return "https://images.unsplash.com/photo-1612698093158-e07ac200d44e?q=80&w=2574&auto=format&fit=crop";
    }
    return imageUrl;
  };

  return (
    <div className="relative h-full min-h-[300px] overflow-hidden rounded-l-lg">
      <img 
        src={getImageUrl()} 
        alt={title}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        onError={() => setImageError(true)}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <h2 className="text-white text-2xl font-bold drop-shadow-lg">
          {title}
        </h2>
      </div>
    </div>
  );
};

export default DayImage;