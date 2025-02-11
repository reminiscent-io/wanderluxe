
import React from 'react';

interface UnsplashImageProps {
  src: string;
  alt: string;
  photographer: string;
  className?: string;
}

const UnsplashImage: React.FC<UnsplashImageProps> = ({
  src,
  alt,
  photographer,
  className = "",
}) => {
  return (
    <div className="relative group">
      <img
        src={src}
        alt={alt}
        className={`${className} w-full h-full object-cover`}
      />
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/60 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
        Photo by{' '}
        <a
          href={`https://unsplash.com/@${photographer}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-200"
        >
          {photographer}
        </a>
        {' '}on{' '}
        <a
          href="https://unsplash.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-200"
        >
          Unsplash
        </a>
      </div>
    </div>
  );
};

export default UnsplashImage;
