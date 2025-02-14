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

interface EditItemDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  item: {
    id: string;
    category: string;
    title: string;
    description?: string;
    image_url?: string;
    source_url?: string;
  };
  onClose: () => void;
}

const CATEGORIES = ['Accommodations', 'Activities', 'Transportation', 'Restaurants'];

const EditItemDialog: React.FC<EditItemDialogProps> = ({
  isOpen,
  onOpenChange,
  item,
  onClose,
}) => {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description || "");
  const [category, setCategory] = useState(item.category);
  const [sourceUrl, setSourceUrl] = useState(item.source_url || "");
  const [imageUrl, setImageUrl] = useState(item.image_url || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);

  useEffect(() => {
    setTitle(item.title);
    setDescription(item.description || "");
    setCategory(item.category);
    setSourceUrl(item.source_url || "");
    setImageUrl(item.image_url || "");
  }, [item]);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      if (sourceUrl && sourceUrl !== item.source_url) {
        fetchUrlMetadata(sourceUrl);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [sourceUrl, item.source_url]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !title) {
      toast.error("Please fill in all required fields");
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('vision_board_items')
        .update({
          category,
          title,
          description,
          image_url: imageUrl,
          source_url: sourceUrl,
        })
        .eq('id', item.id);
      if (error) throw error;
      toast.success("Item updated successfully");
      onClose();
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error("Failed to update item");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Vision Board Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="category">Category *</Label>
            <Select value={category} onValueChange={setCategory}>
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
            <Label htmlFor="sourceUrl">Source URL</Label>
            <div className="relative">
              <Input
                id="sourceUrl"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://..."
              />
              {isFetchingMetadata && (
                <Loader2 className="animate-spin h-4 w-4 absolute right-3 top-3" />
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="image">Image</Label>
            <ImageUpload
              value={imageUrl}
              onChange={setImageUrl}
              onRemove={() => setImageUrl('')}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditItemDialog;
