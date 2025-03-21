
import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DateChangeConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  dayCount: number;
  activityCount: number;
}

const DateChangeConfirmationDialog: React.FC<DateChangeConfirmationDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  dayCount,
  activityCount,
}) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Date Change</AlertDialogTitle>
          <AlertDialogDescription>
            Shortening this trip will remove {dayCount} {dayCount === 1 ? 'day' : 'days'} 
            and {activityCount} {activityCount === 1 ? 'activity' : 'activities'}. 
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DateChangeConfirmationDialog;
