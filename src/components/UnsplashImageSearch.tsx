
import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import UnsplashImage from './UnsplashImage';

interface UnsplashImageSearchProps {
  searchQuery: string;
  onSelectImage: (imageUrl: string) => void;
  showAttribution?: boolean;
}

interface UnsplashImageData {
  id: string;
  url: string;
  description: string;
  photographer: string;
  unsplashUsername: string;
}

const UnsplashImageSearch: React.FC<UnsplashImageSearchProps> = ({
  searchQuery,
  onSelectImage,
  showAttribution = true
}) => {
  const [images, setImages] = useState<UnsplashImageData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchImages = async () => {
      if (!searchQuery || searchQuery.trim().length < 2) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/unsplash-search?query=${encodeURIComponent(searchQuery)}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch images: ${response.statusText}`);
        }
        
        const data = await response.json();
        setImages(data.images || []);
      } catch (err) {
        console.error('Error fetching Unsplash images:', err);
        setError('Failed to load images. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchImages();
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-4 text-destructive">
        <p>{error}</p>
      </div>
    );
  }

  if (images.length === 0 && searchQuery.trim().length > 1) {
    return (
      <div className="text-center p-4 text-muted-foreground">
        <p>No images found. Try a different search term.</p>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center p-4 text-muted-foreground">
        <p>Enter a search term to find images</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {images.map((image) => (
        <div 
          key={image.id} 
          className="cursor-pointer border hover:border-primary transition-all rounded-md overflow-hidden"
          onClick={() => onSelectImage(image.url)}
        >
          <UnsplashImage 
            src={image.url} 
            alt={image.description || 'Unsplash image'} 
            className="w-full h-40 object-cover"
            showAttribution={showAttribution}
          />
        </div>
      ))}
    </div>
  );
};

export default UnsplashImageSearch;
