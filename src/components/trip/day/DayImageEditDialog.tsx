
import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import UnsplashImageSearch from '@/components/UnsplashImageSearch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface DayImageEditDialogProps {
  dayId: string;
  tripId: string;
  currentImageUrl?: string | null;
  onClose: () => void;
}

const DayImageEditDialog: React.FC<DayImageEditDialogProps> = ({
  dayId,
  tripId,
  currentImageUrl,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(currentImageUrl || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const handleImageSelect = (imageUrl: string) => {
    setSelectedImageUrl(imageUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedImageUrl) {
      toast.error('Please select an image');
      return;
    }

    setIsSubmitting(true);
    try {
      // Update the day's image URL in the database
      const { error } = await supabase
        .from('trip_days')
        .update({ image_url: selectedImageUrl })
        .eq('id', dayId);

      if (error) throw error;

      toast.success('Day image updated successfully');
      
      // Invalidate the day and trip queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['day', dayId] });
      queryClient.invalidateQueries({ queryKey: ['trip-days', tripId] });
      
      onClose();
    } catch (error) {
      console.error('Error updating day image:', error);
      toast.error('Failed to update day image');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogTitle>Edit Day Image</DialogTitle>
        <DialogDescription>
          Search for an image on Unsplash or enter an image URL
        </DialogDescription>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="searchQuery">Search Unsplash</Label>
            <div className="flex gap-2">
              <Input
                id="searchQuery"
                placeholder="e.g., rome, beach sunset, mountains"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <UnsplashImageSearch 
            searchQuery={searchQuery}
            onImageSelect={handleImageSelect}
            selectedImageUrl={selectedImageUrl}
          />
          
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !selectedImageUrl}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Image'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DayImageEditDialog;
