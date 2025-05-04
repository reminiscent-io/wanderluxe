
import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ImageUpload from "@/components/ImageUpload";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export const CATEGORIES = ['Accommodations', 'Activities', 'Transportation', 'Restaurants'];

interface VisionBoardItemFormProps {
  initialData: {
    category: string;
    title: string;
    description?: string;
    image_url?: string;
    source_url?: string;
  };
  onSubmit: (formData: any) => Promise<void>;
  onClose: () => void;
  isSubmitting: boolean;
  isFetchingMetadata: boolean;
  submitLabel: string;
}

const VisionBoardItemForm: React.FC<VisionBoardItemFormProps> = ({
  initialData,
  onSubmit,
  onClose,
  isSubmitting,
  isFetchingMetadata,
  submitLabel
}) => {
  const [category, setCategory] = useState(initialData.category);
  const [title, setTitle] = useState(initialData.title);
  const [description, setDescription] = useState(initialData.description || "");
  const [sourceUrl, setSourceUrl] = useState(initialData.source_url || "");
  const [imageUrl, setImageUrl] = useState(initialData.image_url || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !title) {
      return;
    }
    await onSubmit({
      category,
      title,
      description,
      source_url: sourceUrl,
      image_url: imageUrl
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="category">Category *</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            {CATEGORIES.map(cat => (
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
          onChange={e => setTitle(e.target.value)} 
          placeholder="Enter a title" 
          required 
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea 
          id="description" 
          value={description} 
          onChange={e => setDescription(e.target.value)} 
          placeholder="Add some details..." 
          rows={1} 
        />
      </div>

      <div>
        <Label htmlFor="sourceUrl">Source URL</Label>
        <div className="relative">
          <Input 
            id="sourceUrl" 
            value={sourceUrl} 
            onChange={e => setSourceUrl(e.target.value)} 
            placeholder="https://..." 
          />
          {isFetchingMetadata && <Loader2 className="animate-spin h-4 w-4 absolute right-3 top-3" />}
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
        <Button 
          type="submit" 
          disabled={isSubmitting} 
          className="bg-earth-500 hover:bg-earth-400 text-sand-50"
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
};

export default VisionBoardItemForm;
