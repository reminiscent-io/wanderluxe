
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ImageGenerationSectionProps {
  onImageSelect: (image: string) => void;
  selectedImage: string | null;
}

const ImageGenerationSection: React.FC<ImageGenerationSectionProps> = ({
  onImageSelect,
  selectedImage
}) => {
  const [imagePrompt, setImagePrompt] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateImages = async () => {
    if (!imagePrompt.trim()) {
      toast.error('Please enter a prompt first');
      return;
    }

    setIsLoading(true);
    try {
      const { data: response, error } = await supabase.functions.invoke('generate-image', {
        body: { keywords: imagePrompt }
      });

      if (error) {
        console.error('Error generating images:', error);
        throw error;
      }

      if (!response?.images?.length) {
        toast.error('No images found for this prompt');
        return;
      }

      setImages(response.images.map((img: any) => img.url));
    } catch (error) {
      console.error('Error generating images:', error);
      toast.error('Failed to generate images');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium mb-2 block">Generate Image</label>
        <div className="flex gap-2">
          <Input
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            placeholder="Where will you be today?"
          />
          <Button
            onClick={handleGenerateImages}
            disabled={isLoading || !imagePrompt.trim()}
          >
            {isLoading ? (
              <Loader className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ImageIcon className="h-4 w-4 mr-2" />
            )}
            Generate
          </Button>
        </div>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((image, index) => (
            <div
              key={index}
              className={`relative aspect-video cursor-pointer rounded-lg overflow-hidden ${
                selectedImage === image ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => onImageSelect(image)}
            >
              <img
                src={image}
                alt={`Option ${index + 1}`}
                className="object-cover w-full h-full"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageGenerationSection;
