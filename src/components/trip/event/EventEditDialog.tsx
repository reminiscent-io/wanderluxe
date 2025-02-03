import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import EventEditForm from '../EventEditForm';

interface EventEditDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editData: any;
  onEditDataChange: (data: any) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const EventEditDialog: React.FC<EventEditDialogProps> = ({
  isOpen,
  onOpenChange,
  editData,
  onEditDataChange,
  onSubmit
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
        </DialogHeader>
        <EventEditForm
          editData={editData}
          onEditDataChange={onEditDataChange}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
};

export default EventEditDialog;