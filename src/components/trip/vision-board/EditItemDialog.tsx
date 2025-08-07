
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
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
  const [isDeleting, setIsDeleting] = useState(false);
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

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('vision_board_items')
        .delete()
        .eq('id', item.id);

      if (error) throw error;
      toast.success("Item deleted successfully");
      onClose();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error("Failed to delete item");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[500px] mx-auto">
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
          onDelete={handleDelete}
          isDeleting={isDeleting}
        />
      </DialogContent>
    </Dialog>
  );
};

export default EditItemDialog;
