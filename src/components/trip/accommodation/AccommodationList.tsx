
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AccommodationFormData } from '@/services/accommodation/accommodationService';
import AccommodationItem from './AccommodationItem';
import AccommodationDialog from './AccommodationDialog';
import { useAccommodationHandlers } from './hooks/useAccommodationHandlers';

interface AccommodationListProps {
  tripId: string;
  accommodations: any[];
  onRefresh: () => void;
  tripArrivalDate: string | null;
  tripDepartureDate: string | null;
}

const AccommodationList: React.FC<AccommodationListProps> = ({
  tripId,
  accommodations,
  onRefresh,
  tripArrivalDate,
  tripDepartureDate
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const {
    editingStay,
    setEditingStay,
    handleSubmit,
    handleUpdate,
    handleDelete
  } = useAccommodationHandlers(tripId, onRefresh);

  const handleFormSubmit = async (data: AccommodationFormData) => {
    try {
      if (editingStay && editingStay.stay_id) {
        await handleUpdate(editingStay.stay_id, data);
      } else {
        await handleSubmit(data);
      }
      setIsDialogOpen(false);
      setEditingStay(null);
    } catch (error) {
      console.error("Error saving accommodation:", error);
    }
  };

  const handleEditClick = (stay: AccommodationFormData) => {
    setEditingStay(stay);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingStay(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-700">Hotel Stays</h3>
        <Button 
          onClick={() => setIsDialogOpen(true)} 
          className="bg-earth-500 hover:bg-earth-600 text-white"
          size="sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Hotel
        </Button>
      </div>

      {accommodations.length === 0 ? (
        <div className="text-sm text-gray-500 py-2">
          No hotel stays added yet.
        </div>
      ) : (
        <div className="space-y-3">
          {accommodations.map((stay) => (
            <AccommodationItem
              key={stay.stay_id}
              stay={stay}
              onEdit={() => handleEditClick(stay)}
              onDelete={() => handleDelete(stay.stay_id)}
            />
          ))}
        </div>
      )}

      <AccommodationDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        onSubmit={handleFormSubmit}
        initialData={editingStay}
        tripArrivalDate={tripArrivalDate}
        tripDepartureDate={tripDepartureDate}
        isEditing={!!editingStay}
      />
    </div>
  );
};

export default AccommodationList;
