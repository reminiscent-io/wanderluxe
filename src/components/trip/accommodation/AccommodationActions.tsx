import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import AccommodationForm from './AccommodationForm';
import { AccommodationFormData } from '@/services/accommodation/accommodationService';

interface AccommodationActionsProps {
  isAddingAccommodation: boolean;
  setIsAddingAccommodation: (value: boolean) => void;
  editingStay: string | null;
  onSubmit: (formData: AccommodationFormData) => Promise<void>;
  initialData?: AccommodationFormData;
  onCancel: () => void;
}

const AccommodationActions = ({
  isAddingAccommodation,
  setIsAddingAccommodation,
  editingStay,
  onSubmit,
  initialData,
  onCancel
}: AccommodationActionsProps) => {
  if (editingStay) {
    return (
      <Card className="p-6 bg-white">
        <AccommodationForm 
          onSubmit={onSubmit}
          onCancel={onCancel}
          initialData={initialData}
        />
      </Card>
    );
  }

  return !isAddingAccommodation ? (
    <Button
      onClick={() => setIsAddingAccommodation(true)}
      variant="outline"
      className="w-full"
    >
      <Plus className="h-4 w-4 mr-2" />
      Add Accommodation
    </Button>
  ) : (
    <Card className="p-6 bg-white">
      <AccommodationForm 
        onSubmit={onSubmit}
        onCancel={() => setIsAddingAccommodation(false)}
      />
    </Card>
  );
};

export default AccommodationActions;