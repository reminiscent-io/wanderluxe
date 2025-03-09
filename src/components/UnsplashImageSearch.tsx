import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export interface UnsplashImageData {
  url: string;
  photographer: string;
  unsplashUsername: string;
}

interface UnsplashImageSearchProps {
  searchQuery: string;
  onSelectImage: (url: string, imageData?: UnsplashImageData) => void;
}

const UnsplashImageSearch: React.FC<UnsplashImageSearchProps> = ({
  searchQuery,
  onSelectImage,
}) => {
  const [images, setImages] = useState<UnsplashImageData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchImages = async () => {
      if (!searchQuery.trim()) {
        setImages([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/unsplash-search?query=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();
        setImages(data);
      } catch (error) {
        console.error('Error fetching Unsplash images:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [searchQuery]);

  return (
    <div>
      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {!loading && images.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {images.map((image, index) => (
            <Card 
              key={index} 
              className="cursor-pointer overflow-hidden"
              onClick={() => onSelectImage(image.url, image)}
            >
              <CardContent className="p-0">
                <img
                  src={image.url}
                  alt={`Photo by ${image.photographer}`}
                  className="h-32 w-full object-cover"
                />
                <div className="p-2 text-xs text-muted-foreground truncate">
                  {image.photographer}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && searchQuery && images.length === 0 && (
        <p className="text-center py-4 text-muted-foreground">
          No images found for "{searchQuery}"
        </p>
      )}
    </div>
  );
};

export default UnsplashImageSearch;