import React from 'react';
import { Button } from "@/components/ui/button";

interface FormActionsProps {
  isLoading: boolean;
  onCancel: () => void;
}

const FormActions: React.FC<FormActionsProps> = ({
  isLoading,
  onCancel
}) => {
  return (
    <div className="flex justify-end gap-4">
      <Button
        type="button"
        variant="ghost"
        onClick={onCancel}
        className="px-3"
      >
        Cancel
      </Button>
      <Button 
        type="submit" 
        disabled={isLoading}
        className="px-8 border border-primary bg-earth-400 hover:bg-earth-500 text-white"
      >
        {isLoading ? "Creating..." : "Create Trip"}
      </Button>
    </div>
  );
};

export default FormActions;