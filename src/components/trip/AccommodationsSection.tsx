import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import AccommodationHeader from './accommodation/AccommodationHeader';
import HotelStaysList from './accommodation/HotelStaysList';
import AccommodationDialog from './accommodation/AccommodationDialog';
import { formatDateRange } from '@/utils/dateUtils';
import { useAccommodationHandlers } from './accommodation/hooks/useAccommodationHandlers';
import { useTripDays } from '@/hooks/use-trip-days';
import type { HotelStay } from '@/types/trip';

interface AccommodationsSectionProps {
  tripId: string;
  onAccommodationChange: () => void;
  hotelStays: HotelStay[];
  className?: string;
}

const AccommodationsSection: React.FC<AccommodationsSectionProps> = ({
  className,
  tripId,
  onAccommodationChange,
  hotelStays
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editHotelStay, setEditHotelStay] = useState<HotelStay | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Use the main useTripDays hook to get trip dates
  const { days } = useTripDays(tripId);
  const tripDates = {
    arrival_date: days?.[0]?.date || null,
    departure_date: days?.[days?.length - 1]?.date || null
  };

  // Only need delete handler from the original handlers
  const { handleDelete } = useAccommodationHandlers(tripId, onAccommodationChange);

  // Open edit dialog when an edit button is clicked
  const handleEdit = (stayId: string) => {
    const stayToEdit = hotelStays.find(stay => stay.stay_id === stayId);
    if (stayToEdit) {
      setEditHotelStay(stayToEdit);
      setIsEditDialogOpen(true);
    }
  };

  // Sort hotel stays by check-in date in ascending order
  const sortedHotelStays = (hotelStays || []).sort((a, b) =>
    new Date(a.hotel_checkin_date).getTime() - new Date(b.hotel_checkin_date).getTime()
  );

  return (
    <Card className="bg-sand-50 shadow-md">
      <AccommodationHeader 
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
      />

      {isExpanded && (
        <>
          <div className="mb-4">
            <Button 
              onClick={() => setIsAddDialogOpen(true)}
              variant="outline"
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Hotel Stay
            </Button>
          </div>

          <HotelStaysList
            hotelStays={sortedHotelStays}
            onEdit={handleEdit}
            onDelete={handleDelete}
            formatDateRange={formatDateRange}
          />

          {/* Dialog for adding a new hotel stay */}
          <AccommodationDialog
            tripId={tripId}
            open={isAddDialogOpen}
            onOpenChange={setIsAddDialogOpen}
            onSuccess={onAccommodationChange}
          />

          {/* Dialog for editing an existing hotel stay */}
          <AccommodationDialog
            tripId={tripId}
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            initialData={editHotelStay || undefined}
            onSuccess={onAccommodationChange}
          />
        </>
      )}
    </Card>
  );
};

export default AccommodationsSection;