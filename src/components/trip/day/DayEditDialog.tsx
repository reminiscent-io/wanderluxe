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
import ImageGenerationSection from './dialogs/ImageGenerationSection';
import { toast } from "sonner";

interface DayEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayId: string;
  currentTitle: string;
  onTitleChange: (title: string) => void;
  onSave: (data: { title: string; image_url?: string }) => Promise<void>;
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
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setTitle(currentTitle);
  }, [currentTitle]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updateData: { title: string; image_url?: string } = { title };
      if (selectedImage) {
        updateData.image_url = selectedImage;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Day Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title Row */}
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

          {/* Image Generation Section */}
          <div className="space-y-1">
            <Label className="text-sm font-medium text-gray-700">
              Generate Image
            </Label>
            <ImageGenerationSection
              onImageSelect={setSelectedImage}
              selectedImage={selectedImage}
            />
          </div>
        </div>

        <DialogFooter>
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
