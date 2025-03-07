
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import UnsplashImage from './UnsplashImage';

interface UnsplashImageSearchProps {
  searchQuery: string;
  onImageSelect: (imageUrl: string) => void;
  selectedImageUrl: string | null;
}

interface UnsplashImageResult {
  id: string;
  url: string;
  description: string;
  photographer: string;
  username: string;
}

const UnsplashImageSearch: React.FC<UnsplashImageSearchProps> = ({
  searchQuery,
  onImageSelect,
  selectedImageUrl,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<UnsplashImageResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const searchUnsplash = async () => {
      if (!searchQuery || searchQuery.trim() === '') {
        setImages([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/functions/v1/generate-image?query=${encodeURIComponent(searchQuery)}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch images');
        }

        const data = await response.json();
        
        if (data.images && Array.isArray(data.images)) {
          setImages(data.images);
        } else {
          setImages([]);
          setError('No images found');
        }
      } catch (err) {
        console.error('Error searching Unsplash:', err);
        setError('Failed to search for images');
        setImages([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      searchUnsplash();
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-gray-600">
        {error}
      </div>
    );
  }

  if (images.length === 0 && searchQuery) {
    return (
      <div className="text-center py-8 text-gray-600">
        No images found for "{searchQuery}"
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600">
        Enter a search term to find images
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto p-2">
      {images.map((image) => (
        <div 
          key={image.id}
          className={`relative cursor-pointer rounded-md overflow-hidden transition-all duration-200 ${
            selectedImageUrl === image.url ? 'ring-2 ring-primary ring-offset-2' : 'hover:opacity-90'
          }`}
          onClick={() => onImageSelect(image.url)}
        >
          <UnsplashImage 
            src={image.url} 
            alt={image.description || 'Unsplash image'} 
            className="w-full aspect-[3/2] object-cover"
            showAttribution={false}
          />
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/60 text-white text-xs">
            Photo by {image.photographer}
          </div>
          {selectedImageUrl === image.url && (
            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
              <Button variant="secondary" size="sm">Selected</Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default UnsplashImageSearch;
