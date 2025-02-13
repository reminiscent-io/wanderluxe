
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ImageUpload from "@/components/ImageUpload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface AddItemDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  selectedCategory: string | null;
  onClose: () => void;
}

const CATEGORIES = ['Accommodations', 'Activities', 'Transportation', 'Restaurants'];

const AddItemDialog: React.FC<AddItemDialogProps> = ({
  isOpen,
  onOpenChange,
  tripId,
  selectedCategory,
  onClose,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(selectedCategory || "");
  const [sourceUrl, setSourceUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setTitle("");
      setDescription("");
      setCategory(selectedCategory || "");
      setSourceUrl("");
      setImageUrl("");
      setIsSubmitting(false);
      setIsFetchingMetadata(false);
    }
  }, [isOpen, selectedCategory]);

  // Fetch metadata when URL changes
  const fetchUrlMetadata = async (url: string) => {
    if (!url || isFetchingMetadata) return;

    setIsFetchingMetadata(true);
    try {
      const { data, error } = await supabase.functions.invoke('fetch-url-metadata', {
        body: { url }
      });

      if (error) throw error;

      if (data.image_url && !imageUrl) {
        setImageUrl(data.image_url);
      }
      if (data.title && !title) {
        setTitle(data.title);
      }
      if (data.description && !description) {
        setDescription(data.description);
      }
    } catch (error) {
      console.error('Error fetching URL metadata:', error);
      toast.error("Failed to fetch URL metadata");
    } finally {
      setIsFetchingMetadata(false);
    }
  };

  // Debounce URL changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (sourceUrl) {
        fetchUrlMetadata(sourceUrl);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [sourceUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !title) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      // Get the current highest order index for this category
      const { data: existingItems } = await supabase
        .from('vision_board_items')
        .select('order_index')
        .eq('trip_id', tripId)
        .eq('category', category)
        .order('order_index', { ascending: false })
        .limit(1);

      const newOrderIndex = (existingItems?.[0]?.order_index ?? -1) + 1;

      const { error } = await supabase
        .from('vision_board_items')
        .insert({
          trip_id: tripId,
          category,
          title,
          description,
          image_url: imageUrl,
          source_url: sourceUrl,
          order_index: newOrderIndex,
        });

      if (error) throw error;

      toast.success("Item added successfully");
      onClose();
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error("Failed to add item");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Vision Board Item</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select
                value={category}
                onValueChange={setCategory}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add some details..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="sourceUrl" className="flex items-center gap-2">
                Source URL
                {isFetchingMetadata && (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                )}
              </Label>
              <Input
                id="sourceUrl"
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div>
              <Label>Image</Label>
              <ImageUpload
                onImageUpload={setImageUrl}
                currentImageUrl={imageUrl}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onClose()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Adding..." : "Add Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddItemDialog;
