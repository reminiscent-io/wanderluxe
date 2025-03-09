import React from 'react';
import UnsplashImage from '@/components/UnsplashImage';

interface DayImageProps {
  dayId: string;
  title: string;
  imageUrl: string | null;
  defaultImageUrl?: string;
  photographer?: string | null;
  unsplashUsername?: string | null;
  onEditImage?: () => void;
  customClass?: string;
}

const DayImage: React.FC<DayImageProps> = ({
  dayId,
  title,
  imageUrl,
  defaultImageUrl = '',
  photographer = null,
  unsplashUsername = null,
  onEditImage,
  customClass = '',
}) => {
  console.log('DayImage rendering with:', { dayId, title, imageUrl, defaultImageUrl, displayImageUrl: imageUrl || defaultImageUrl });

  const displayImageUrl = imageUrl || defaultImageUrl;

  if (!displayImageUrl) {
    return null;
  }

  return (
    <div className={`relative w-full h-40 mb-4 ${customClass}`}>
      <UnsplashImage
        imageUrl={displayImageUrl}
        photographer={photographer}
        unsplashUsername={unsplashUsername}
        altText={title}
        className="w-full h-full rounded-md"
      />
      <div className="absolute inset-0 bg-black/30 flex flex-col justify-end p-4 rounded-md">
        <h3 className="text-white text-xl font-bold">{title}</h3>
      </div>
    </div>
  );
};

export default DayImage;