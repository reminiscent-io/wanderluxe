import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import AccommodationItem from './AccommodationItem';
import AccommodationDialog from './AccommodationDialog';
import { Tables } from '@/integrations/supabase/types';
import useAccommodationHandlers from './hooks/useAccommodationHandlers';

type Accommodation = Tables<'accommodations'>;

interface AccommodationListProps {
  accommodations: Accommodation[];
  tripId: string;
  onAccommodationsChange: () => void;
}

const AccommodationList: React.FC<AccommodationListProps> = ({
  accommodations,
  tripId,
  onAccommodationsChange
}) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editAccommodation, setEditAccommodation] = useState<Accommodation | undefined>(undefined);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { handleDelete } = useAccommodationHandlers(tripId, onAccommodationsChange);

  const handleEdit = (accommodation: Accommodation) => {
    setEditAccommodation(accommodation);
    setIsEditDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    onAccommodationsChange();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Your Stays</h3>
        <Button 
          onClick={() => setIsAddDialogOpen(true)} 
          size="sm" 
          className="bg-earth-500 hover:bg-earth-600 text-sand-50"
        >
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      {accommodations.length === 0 ? (
        <p className="text-gray-500 text-sm">No accommodations added yet.</p>
      ) : (
        <div className="space-y-3">
          {accommodations.map((accommodation) => (
            <AccommodationItem
              key={accommodation.stay_id}
              accommodation={accommodation}
              onEdit={() => handleEdit(accommodation)}
              onDelete={() => handleDelete(accommodation.stay_id)}
            />
          ))}
        </div>
      )}

      {/* Add Accommodation Dialog */}
      <AccommodationDialog
        tripId={tripId}
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={handleDialogSuccess}
      />

      {/* Edit Accommodation Dialog */}
      <AccommodationDialog
        tripId={tripId}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        initialData={editAccommodation}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
};

export default AccommodationList;