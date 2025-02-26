
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import VisionBoardItemForm from './VisionBoardItemForm';

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

const EditItemDialog: React.FC<EditItemDialogProps> = ({
  isOpen,
  onOpenChange,
  item,
  onClose
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingMetadata] = useState(false);

  const handleSubmit = async (formData: any) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('vision_board_items')
        .update(formData)
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
        <VisionBoardItemForm
          initialData={item}
          onSubmit={handleSubmit}
          onClose={onClose}
          isSubmitting={isSubmitting}
          isFetchingMetadata={isFetchingMetadata}
          submitLabel="Update Item"
        />
      </DialogContent>
    </Dialog>
  );
};

export default EditItemDialog;
