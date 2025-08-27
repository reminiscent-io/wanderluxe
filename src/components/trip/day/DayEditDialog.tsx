import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import ImageGenerationSection from './dialogs/ImageGenerationSection';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface DayEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayId: string;
  currentTitle: string;
  onTitleChange: (title: string) => void;
  onSave: (data: { title: string; image_url?: string; image_position?: string }) => Promise<void>;
}

const DayEditDialog: React.FC<DayEditDialogProps> = ({
  open,
  onOpenChange,
  dayId,
  currentTitle,
  onTitleChange,
  onSave,
}) => {
  const [title, setTitle] = useState(currentTitle);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imagePosition, setImagePosition] = useState<number>(50); // Default 50%
  const [isSaving, setIsSaving] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);

  // Load the current day image and position when dialog opens
  useEffect(() => {
    if (open && dayId) {
      const loadDayImage = async () => {
        try {
          const { data, error } = await supabase
            .from('trip_days')
            .select('image_url, image_position')
            .eq('day_id', dayId)
            .single();
          if (!error && data) {
            if (data.image_url) {
              setCurrentImage(data.image_url);
              setSelectedImage(data.image_url);
            }
            if (data.image_position) {
              const positionMatch = data.image_position.match(/center\s+(\d+)%/);
              if (positionMatch?.[1]) {
                setImagePosition(parseInt(positionMatch[1], 10));
                // Also update localStorage for quick access
                localStorage.setItem(`day_image_position_${dayId}`, data.image_position);
              }
            }
          }
        } catch (error) {
          console.error('Error loading day image data:', error);
        }
      };
      loadDayImage();
      // Fallback to localStorage if needed
      if (!currentImage) {
        const savedPosition = localStorage.getItem(`day_image_position_${dayId}`);
        if (savedPosition) {
          const positionMatch = savedPosition.match(/center\s+(\d+)%/);
          if (positionMatch && positionMatch[1]) {
            setImagePosition(parseInt(positionMatch[1], 10));
          }
        }
      }
    }
  }, [dayId, open]);

  useEffect(() => {
    setTitle(currentTitle);
  }, [currentTitle]);

  // Save position to localStorage whenever it changes
  useEffect(() => {
    if (imagePosition) {
      localStorage.setItem(`day_image_position_${dayId}`, `center ${imagePosition}%`);
    }
  }, [imagePosition, dayId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updateData: { title: string; image_url?: string; image_position?: string } = { 
        title,
        image_position: `center ${imagePosition}%`
      };
      if (selectedImage) {
        updateData.image_url = selectedImage;
        console.log('Selected image to save:', selectedImage);
      }
      await onSave(updateData);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving day:', error);
      toast.error('Failed to update day');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePositionChange = (value: number[]) => {
    setImagePosition(value[0]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="sm:max-w-[425px]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Edit Day Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4 flex-1 overflow-y-auto px-1">
          {/* Title Field */}
          <div className="space-y-1">
            <Label htmlFor="day-title" className="text-sm font-medium text-gray-700">
              Title
            </Label>
            <Input
              id="day-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                onTitleChange(e.target.value);
              }}
              placeholder="Enter day title"
            />
          </div>
          {/* Image Position Adjustment */}
          {selectedImage && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Image Position <span className="text-sm text-gray-500 ml-2">({imagePosition}%)</span>
              </Label>
              <div className="flex mt-4 h-32 gap-4">
                {/* Vertical slider for image position */}
                <div className="h-full flex items-center">
                  <Slider 
                    defaultValue={[imagePosition]}
                    min={0}
                    max={100}
                    step={1}
                    value={[imagePosition]}
                    onValueChange={handlePositionChange}
                    orientation="vertical"
                    className="h-full"
                  />
                </div>
                {/* Image preview with applied position */}
                <div className="relative flex-1 overflow-hidden rounded-md">
                  {selectedImage && (
                    <img 
                      src={selectedImage}
                      alt="Selected preview"
                      className="absolute inset-0 h-full w-full object-cover"
                      style={{ objectPosition: `center ${imagePosition}%` }}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
          {/* Image Generation Section */}
          <div className="space-y-1">
            <ImageGenerationSection
              onImageSelect={setSelectedImage}
              selectedImage={selectedImage}
              dayId={dayId}
            />
          </div>
        </div>
        <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-earth-500"
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-sand-500 hover:bg-sand-600 border-2 border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sand-500 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DayEditDialog;
