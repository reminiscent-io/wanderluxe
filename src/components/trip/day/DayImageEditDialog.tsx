import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import UnsplashImageSearch from '@/components/UnsplashImageSearch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface UnsplashImageData {
  id: string;
  url: string;
  description: string;
  photographer: string;
  unsplashUsername: string;
}

interface DayImageEditDialogProps {
  dayId: string;
  tripId: string;
  currentImageUrl: string | null;
  onClose: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DayImageEditDialog: React.FC<DayImageEditDialogProps> = ({
  dayId,
  tripId,
  currentImageUrl,
  onClose,
  open,
  onOpenChange
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [unsplashImage, setUnsplashImage] = useState<UnsplashImageData | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState('');

  useEffect(() => {
    const fetchExistingImage = async () => {
      if (!dayId || !open) return;

      try {
        const { data, error } = await supabase
          .from('days')
          .select('image_url')
          .eq('id', dayId) // Corrected to 'id' from 'day_id'
          .single();

        if (error) {
          throw error;
        }

        if (data?.image_url) {
          setSelectedImageUrl(data.image_url);
        } else {
          setSelectedImageUrl('');
        }
      } catch (error) {
        console.error('Error fetching day image:', error);
        toast.error('Failed to load image information');
      }
    };

    fetchExistingImage();
  }, [dayId, open]);

  const handleSave = async () => {
    if (!dayId) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('days')
        .update({
          image_url: selectedImageUrl,
          // Save attribution data if we have it
          photographer: unsplashImage?.photographer || null,
          unsplash_username: unsplashImage?.unsplashUsername || null
        })
        .eq('id', dayId); // Corrected to 'id' from 'day_id'

      if (error) {
        throw error;
      }

      toast.success('Image updated successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating day image:', error);
      toast.error('Failed to update image');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsplashSelect = (url: string, imageData?: UnsplashImageData) => {
    setSelectedImageUrl(url);
    setUnsplashImage(imageData || null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Day Image</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="searchQuery">Search Unsplash</Label>
            <div className="flex space-x-2">
              <Input
                id="searchQuery"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g., mountains, beach, city"
              />
            </div>
          </div>

          {selectedImageUrl && (
            <div className="mt-4 border rounded-md overflow-hidden h-40">
              <img 
                src={selectedImageUrl} 
                alt="Selected image" 
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="mt-4 max-h-[300px] overflow-y-auto">
            <UnsplashImageSearch
              searchQuery={searchQuery}
              onSelectImage={handleUnsplashSelect}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DayImageEditDialog;