
import React, { useState } from 'react';
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
}

const DayImageEditDialog: React.FC<DayImageEditDialogProps> = ({
  dayId,
  tripId,
  currentImageUrl,
  onClose
}) => {
  const [imageUrl, setImageUrl] = useState(currentImageUrl || '');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSelectImage = (selected: string) => {
    setImageUrl(selected);
  };

  const handleSave = async () => {
    if (!dayId) return;
    
    setIsLoading(true);
    try {
      // When saving, we should update the image_url along with photographer and username
      // For now we're only saving the URL, but in a production app you'd save the attribution too
      const { error } = await supabase
        .from('days')
        .update({ 
          image_url: imageUrl,
          // Ideally, these fields would be added to your database schema
          // photographer: selectedImage?.photographer,
          // unsplash_username: selectedImage?.unsplashUsername
        })
        .eq('id', dayId);

      if (error) throw error;
      toast.success('Day image updated successfully');
      onClose();
    } catch (error) {
      console.error('Error updating day image:', error);
      toast.error('Failed to update day image');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Day Image</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="imageUrl" className="text-right">
              Image URL
            </Label>
            <Input
              id="imageUrl"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="col-span-3"
              placeholder="Enter image URL or search below"
            />
          </div>
          
          <div className="grid gap-2">
            <Label>Search Unsplash</Label>
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for images..."
              className="mb-4"
            />
            
            <div className="h-[300px] overflow-y-auto border rounded-md p-2">
              <UnsplashImageSearch 
                searchQuery={searchQuery} 
                onSelectImage={handleSelectImage}
                showAttribution={true}
              />
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              'Save Image'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DayImageEditDialog;
