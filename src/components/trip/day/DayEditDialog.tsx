
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from '@/integrations/supabase/client';
import { ImageUpload } from '@/components/ImageUpload';
import { DayActivity } from '@/types/trip';

interface DayEditDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  dayId: string;
  currentTitle: string;
  date: string;
  activities: DayActivity[];
  formatTime: (time?: string) => string;
}

const DayEditDialog: React.FC<DayEditDialogProps> = ({
  isOpen,
  onOpenChange,
  dayId,
  currentTitle,
  date,
}) => {
  const [title, setTitle] = useState(currentTitle);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('trip_days')
        .update({ 
          title,
          image_url: imageUrl
        })
        .eq('day_id', dayId);

      if (error) throw error;
      
      toast.success('Day updated successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating day:', error);
      toast.error('Failed to update day');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (url: string) => {
    setImageUrl(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Day</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-1">
              Title
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for this day"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Day Image
            </label>
            <ImageUpload onUpload={handleImageUpload} />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSubmitting}
            >
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DayEditDialog;
