import React, { useState, useCallback } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Wand2 } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import UnsplashImage from '@/components/UnsplashImage';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/utils/cropImageUtil'; // See below for an example

// Define your Unsplash image type
interface UnsplashImageType {
  id: string;
  url: string;
  description: string;
}

interface ImageSectionProps {
  coverImageUrl: string;
  onImageChange: (url: string) => void;
}

const ImageSection: React.FC<ImageSectionProps> = ({ coverImageUrl, onImageChange }) => {
  const [imageKeywords, setImageKeywords] = useState("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<UnsplashImageType[]>([]);
  // New state for cropping
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

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
    // Instead of immediately setting the image, open the cropper.
    setSelectedImage(imageUrl);
    setShowCropper(true);
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropSave = async () => {
    try {
      const croppedImageUrl = await getCroppedImg(selectedImage, croppedAreaPixels);
      onImageChange(croppedImageUrl);
      setShowCropper(false);
      setSelectedImage(null);
      setGeneratedImages([]);
      toast.success('Image selected successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to crop image');
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
            {isGeneratingImage ? "Generating..." : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Generate
              </>
            )}
          </Button>
        </div>

        {/* Show generated images only if not cropping */}
        {generatedImages.length > 0 && !showCropper && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            {generatedImages.map((image) => (
              <Button
                key={image.id}
                variant="ghost"
                className="p-0 h-auto w-full hover:opacity-90 transition-opacity"
                onClick={() => selectGeneratedImage(image.url)}
              >
                <UnsplashImage
                  src={image.url}
                  className="h-48 rounded-lg w-full"
                  alt={image.description || "Generated image"}
                  showAttribution={true}
                />
              </Button>
            ))}
          </div>
        )}

        {/* Cropper Modal */}
        {showCropper && selectedImage && (
          <div className="relative w-full h-96 bg-black">
            <Cropper
              image={selectedImage}
              crop={crop}
              zoom={zoom}
              aspect={16/9} // Adjust aspect ratio as needed
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
            <div className="flex justify-end gap-2 mt-2">
              <Button type="button" onClick={() => setShowCropper(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleCropSave}>
                Save Crop
              </Button>
            </div>
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
