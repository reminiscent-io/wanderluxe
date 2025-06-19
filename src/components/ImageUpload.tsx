
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Upload, X, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  onRemove?: () => void;
  objectPosition?: string;
  onPositionChange?: (position: string) => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ 
  value, 
  onChange, 
  onRemove,
  objectPosition = "center",
  onPositionChange
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string>('');
  const [position, setPosition] = useState<number>(50); // Default is center (50%)

  useEffect(() => {
    if (value) {
      setPreview(value);
    }
  }, [value]);

  // Initialize position from objectPosition prop
  useEffect(() => {
    if (objectPosition && objectPosition.includes('%')) {
      const positionMatch = objectPosition.match(/center\s+(\d+)%/);
      if (positionMatch && positionMatch[1]) {
        setPosition(parseInt(positionMatch[1], 10));
      }
    }
  }, [objectPosition]);

  // Handle paste events globally when the component is mounted
  useEffect(() => {
    const handlePaste = async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image')) {
          const file = item.getAsFile();
          if (file) {
            await uploadImage(file);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const uploadImage = async (file: File) => {
    try {
      setUploading(true);

      // Validate file size
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      const fileExt = file.name.split('.').pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('trip-images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('trip-images')
        .getPublicUrl(filePath);

      setPreview(publicUrl);
      onChange(publicUrl);
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadImage(file);
    }
  };

  const handleRemove = () => {
    setPreview('');
    onChange('');
    if (onRemove) {
      onRemove();
    }
  };

  const handlePositionChange = (newPosition: number[]) => {
    const pos = newPosition[0];
    setPosition(pos);
    
    if (onPositionChange) {
      onPositionChange(`center ${pos}%`);
    }
  };

  const handleQuickAdjust = (direction: 'up' | 'down') => {
    const change = direction === 'up' ? -10 : 10;
    const newPosition = Math.min(Math.max(position + change, 0), 100);
    setPosition(newPosition);
    
    if (onPositionChange) {
      onPositionChange(`center ${newPosition}%`);
    }
  };

  return (
    <div className="space-y-4">
      {preview ? (
        <div className="space-y-3">
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-48 object-cover rounded-lg"
              style={{ objectPosition: `center ${position}%` }}
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {onPositionChange && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Vertical Position</span>
                <div className="flex gap-1">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => handleQuickAdjust('up')}
                    className="h-6 w-6"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => handleQuickAdjust('down')}
                    className="h-6 w-6"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <Slider
                value={[position]}
                min={0}
                max={100}
                step={1}
                onValueChange={handlePositionChange}
                className="mt-2"
              />
            </div>
          )}
        </div>
      ) : (
        <div className="relative">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            id="image-upload"
            disabled={uploading}
          />
          <label
            htmlFor="image-upload"
            className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
          >
            {uploading ? (
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <p className="mt-2 text-sm text-gray-500">Uploading...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Upload className="h-8 w-8 text-gray-500 mb-2" />
                <p className="text-sm text-gray-500">Click to upload or paste an image</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
              </div>
            )}
          </label>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
