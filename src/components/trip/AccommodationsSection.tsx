import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import AccommodationHeader from './accommodation/AccommodationHeader';
import AccommodationActions from './accommodation/AccommodationActions';
import HotelStaysList from './accommodation/HotelStaysList';
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
  hotelStays = []
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAddingAccommodation, setIsAddingAccommodation] = useState(false);
  const [editingStay, setEditingStay] = useState<HotelStay | null>(null);

  // Use the main useTripDays hook and get dates from its data
  const { days } = useTripDays(tripId);
  const tripDates = {
    arrival_date: days?.[0]?.date || null,
    departure_date: days?.[days?.length - 1]?.date || null
  };

  const {
    handleSubmit,
    handleUpdate,
    handleDelete
  } = useAccommodationHandlers(tripId, onAccommodationChange);

  const handleEdit = (stayId: string) => {
    const stayToEdit = hotelStays.find(stay => stay.stay_id === stayId);
    if (stayToEdit) {
      setEditingStay(stayToEdit);
      setIsAddingAccommodation(true);
    }
  };

  // Sort hotel stays by check-in date in ascending order
  const sortedHotelStays = [...hotelStays].sort((a, b) =>
    new Date(a.hotel_checkin_date).getTime() - new Date(b.hotel_checkin_date).getTime()
  );

  return (
    <Card className="bg-sand-50 shadow-md">
      <AccommodationHeader 
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
      />

      {isExpanded && (
        <div className="p-6 pt-0 space-y-6">
          <HotelStaysList
            hotelStays={sortedHotelStays}
            onEdit={handleEdit}
            onDelete={handleDelete}
            formatDateRange={formatDateRange}
          />

          <AccommodationActions
            isAddingAccommodation={isAddingAccommodation}
            setIsAddingAccommodation={setIsAddingAccommodation}
            editingStay={editingStay}
            onSubmit={editingStay ? 
              (formData) => handleUpdate(editingStay.stay_id, formData)
              : handleSubmit}
            onCancel={() => {
              setEditingStay(null);
              setIsAddingAccommodation(false);
            }}
            initialData={editingStay}
            tripArrivalDate={tripDates.arrival_date}
            tripDepartureDate={tripDates.departure_date}
          />
        </div>
      )}
    </Card>
  );
};

export default AccommodationsSection;