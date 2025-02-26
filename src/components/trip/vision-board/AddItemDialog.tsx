
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import VisionBoardItemForm from './VisionBoardItemForm';

interface AddItemDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  selectedCategory: string | null;
  onClose: () => void;
}

const AddItemDialog: React.FC<AddItemDialogProps> = ({
  isOpen,
  onOpenChange,
  tripId,
  selectedCategory,
  onClose
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);

  const handleSubmit = async (formData: any) => {
    setIsSubmitting(true);
    try {
      const { data: existingItems } = await supabase
        .from('vision_board_items')
        .select('order_index')
        .eq('trip_id', tripId)
        .eq('category', formData.category)
        .order('order_index', { ascending: false })
        .limit(1);

      const newOrderIndex = (existingItems?.[0]?.order_index ?? -1) + 1;

      const { error } = await supabase
        .from('vision_board_items')
        .insert({
          trip_id: tripId,
          ...formData,
          order_index: newOrderIndex
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
        <VisionBoardItemForm
          initialData={{
            category: selectedCategory || "",
            title: "",
            description: "",
            source_url: "",
            image_url: ""
          }}
          onSubmit={handleSubmit}
          onClose={onClose}
          isSubmitting={isSubmitting}
          isFetchingMetadata={isFetchingMetadata}
          submitLabel="Add Item"
        />
      </DialogContent>
    </Dialog>
  );
};

export default AddItemDialog;
