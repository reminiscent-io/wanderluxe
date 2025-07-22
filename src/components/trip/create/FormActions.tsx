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
        disabled={isLoading}
        className="px-3"
      >
        Cancel
      </Button>
      <Button 
        type="submit" 
        disabled={isLoading}
        className={`px-8 border border-primary ${
          isLoading 
            ? 'bg-earth-300 cursor-not-allowed' 
            : 'bg-earth-400 hover:bg-earth-500'
        } text-white transition-colors`}
      >
        {isLoading ? "Creating..." : "Create Trip"}
      </Button>
    </div>
  );
};

export default FormActions;