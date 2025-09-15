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
    <div className="flex justify-end gap-4 pt-4">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={isLoading}
        className="px-6 py-3 rounded-xl border-earth-200 text-earth-600 hover:bg-earth-50"
      >
        Cancel
      </Button>
      <Button 
        type="submit" 
        disabled={isLoading}
        className={`px-8 py-3 rounded-xl shadow-sm font-semibold ${
          isLoading 
            ? 'bg-earth-300 cursor-not-allowed' 
            : 'bg-earth-600 hover:bg-earth-700'
        } text-white transition-all duration-200`}
      >
        {isLoading ? "Creating..." : "Create Trip"}
      </Button>
    </div>
  );
};

export default FormActions;