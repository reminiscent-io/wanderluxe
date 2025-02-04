import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Wand2 } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ImageSectionProps {
  coverImageUrl: string;
  onImageChange: (url: string) => void;
}

const ImageSection: React.FC<ImageSectionProps> = ({ coverImageUrl, onImageChange }) => {
  const [imageKeywords, setImageKeywords] = useState("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const generateImage = async () => {
    if (!imageKeywords.trim()) {
      toast.error("Please enter keywords for image generation");
      return;
    }

    setIsGeneratingImage(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { keywords: imageKeywords }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        onImageChange(data.imageUrl);
        toast.success('Image generated successfully');
      } else {
        throw new Error('Failed to generate image');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Failed to generate image. Please try again.');
    } finally {
      setIsGeneratingImage(false);
    }
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
        <ImageUpload
          onImageUpload={onImageChange}
          currentImageUrl={coverImageUrl}
        />
      </div>
    </div>
  );
};

export default ImageSection;