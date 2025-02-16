
import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Wand2 } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import UnsplashImage from '@/components/UnsplashImage';

interface ImageSectionProps {
  coverImageUrl: string;
  onImageChange: (url: string) => void;
}

interface UnsplashImage {
  id: string;
  url: string;
  description: string;
}

const ImageSection: React.FC<ImageSectionProps> = ({ coverImageUrl, onImageChange }) => {
  const [imageKeywords, setImageKeywords] = useState("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<UnsplashImage[]>([]);

  const generateImage = async () => {
    if (!imageKeywords.trim()) {
      toast.error("Please enter keywords for image generation");
      return;
    }

    setIsGeneratingImage(true);
    setGeneratedImages([]);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { keywords: imageKeywords }
      });

      if (error) throw error;

      if (data?.images && data.images.length > 0) {
        setGeneratedImages(data.images);
        toast.success('Images generated successfully');
      } else {
        throw new Error('No images found');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Failed to generate images. Please try again.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const selectGeneratedImage = (imageUrl: string) => {
    onImageChange(imageUrl);
    setGeneratedImages([]);
    toast.success('Image selected successfully');
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium text-gray-700">
        Cover Image
      </Label>
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Enter keywords for image generation"
            value={imageKeywords}
            onChange={(e) => setImageKeywords(e.target.value)}
          />
          <Button
            type="button"
            onClick={generateImage}
            disabled={isGeneratingImage}
            className="whitespace-nowrap"
          >
            {isGeneratingImage ? (
              "Generating..."
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Generate
              </>
            )}
          </Button>
        </div>

        {generatedImages.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            {generatedImages.map((image) => (
              <div 
                key={image.id} 
                className="relative cursor-pointer"
                onClick={() => selectGeneratedImage(image.url)}
              >
                <UnsplashImage
                  src={image.url}
                  className="h-48 rounded-lg"
                  alt={image.description}
                  showAttribution={true}
                />
              </div>
            ))}
          </div>
        )}

        <ImageUpload
          value={coverImageUrl}
          onChange={onImageChange}
          onRemove={() => onImageChange('')}
        />
      </div>
    </div>
  );
};

export default ImageSection;
