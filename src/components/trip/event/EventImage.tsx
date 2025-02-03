import React from 'react';

interface EventImageProps {
  title: string;
  imageUrl: string;
}

const EventImage: React.FC<EventImageProps> = ({ title, imageUrl }) => {
  const getImageUrl = () => {
    if (title.toLowerCase().includes('naples')) {
      return "https://images.unsplash.com/photo-1516483638261-f4dbaf036963"; 
    } else if (title.toLowerCase().includes('positano')) {
      return "https://images.unsplash.com/photo-1533606688076-b6683a5f59f1"; 
    }
    return imageUrl;
  };

  return (
    <div className="h-64 md:h-auto">
      <img 
        src={getImageUrl()} 
        alt={title}
        className="w-full h-full object-cover"
      />
    </div>
  );
};

export default EventImage;