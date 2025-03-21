
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AccommodationFormData } from '@/services/accommodation/accommodationService';
import AccommodationItem from './AccommodationItem';
import AccommodationDialog from './AccommodationDialog';
import { useAccommodationHandlers } from './hooks/useAccommodationHandlers';

interface AccommodationListProps {
  tripId: string;
  accommodations: AccommodationFormData[];
  onSuccess: () => void;
  tripArrivalDate: string | null;
  tripDepartureDate: string | null;
}

const AccommodationList: React.FC<AccommodationListProps> = ({
  tripId,
  accommodations,
  onSuccess,
  tripArrivalDate,
  tripDepartureDate
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStay, setEditingStay] = useState<AccommodationFormData | null>(null);
  
  const {
    handleSubmit,
    handleUpdate,
    handleDelete
  } = useAccommodationHandlers({
    tripId,
    onSuccess,
  });

  const openAddDialog = () => {
    setEditingStay(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (stay: AccommodationFormData) => {
    setEditingStay(stay);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingStay(null);
  };

  const onSubmitForm = async (data: AccommodationFormData) => {
    try {
      if (editingStay && editingStay.stay_id) {
        await handleUpdate(editingStay.stay_id, data);
      } else {
        await handleSubmit(data);
      }
      closeDialog();
    } catch (error) {
      console.error("Error saving accommodation:", error);
    }
  };

  return (
    <div className="space-y-4 p-2">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">Accommodations</h2>
        <Button 
          onClick={openAddDialog}
          className="bg-earth-500 hover:bg-earth-600 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Hotel Stay
        </Button>
      </div>

      <div className="space-y-3">
        {accommodations.length === 0 ? (
          <p className="text-gray-500 text-sm">No accommodations added yet.</p>
        ) : (
          accommodations.map((stay) => (
            <AccommodationItem
              key={stay.stay_id}
              stay={stay}
              onEdit={() => openEditDialog(stay)}
              onDelete={() => handleDelete(stay.stay_id!)}
            />
          ))
        )}
      </div>

      <AccommodationDialog
        isOpen={isDialogOpen}
        onClose={closeDialog}
        onSubmit={onSubmitForm}
        initialData={editingStay}
        tripArrivalDate={tripArrivalDate}
        tripDepartureDate={tripDepartureDate}
        isEditing={!!editingStay}
      />
    </div>
  );
};

export default AccommodationList;
