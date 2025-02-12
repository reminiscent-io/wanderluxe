
import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import AccommodationHeader from './accommodation/AccommodationHeader';
import AccommodationActions from './accommodation/AccommodationActions';
import HotelStaysList from './accommodation/HotelStaysList';
import { formatDateRange } from '@/utils/dateUtils';
import { useAccommodationHandlers } from './accommodation/hooks/useAccommodationHandlers';
import { useTripDates } from './accommodation/hooks/useTripDates';
import type { HotelStay } from '@/services/accommodation/types';

interface AccommodationsSectionProps {
  tripId: string;
  onAccommodationChange: () => void;
  hotelStays: HotelStay[];
}

const AccommodationsSection: React.FC<AccommodationsSectionProps> = ({
  tripId,
  onAccommodationChange,
  hotelStays
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const tripDates = useTripDates(tripId);
  
  const {
    isAddingAccommodation,
    setIsAddingAccommodation,
    editingStay,
    setEditingStay,
    handleSubmit,
    handleUpdate,
    handleDelete
  } = useAccommodationHandlers(tripId, onAccommodationChange);

  const handleEdit = (stayId: string) => {
    const stayToEdit = hotelStays.find(stay => stay.stay_id === stayId);
    if (stayToEdit) {
      setEditingStay({
        ...stayToEdit,
        expense_cost: stayToEdit.expense_cost?.toString() || null,
        hotel_details: stayToEdit.hotel_details || '',
        currency: stayToEdit.currency || 'USD',
        hotel_url: stayToEdit.hotel_url || '',
        hotel_address: stayToEdit.hotel_address || '',
        hotel_phone: stayToEdit.hotel_phone || ''
      });
    }
  };

  // Sort hotel stays by check-in date in ascending order
  const sortedHotelStays = hotelStays.sort((a, b) =>
    new Date(a.hotel_checkin_date).getTime() - new Date(b.hotel_checkin_date).getTime()
  );

  return (
    <Card>
      <AccommodationHeader 
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
      />

      {isExpanded && (
        <>
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
            onCancel={() => editingStay ? setEditingStay(null) : setIsAddingAccommodation(false)}
            initialData={editingStay}
            tripArrivalDate={tripDates.arrival_date}
            tripDepartureDate={tripDates.departure_date}
          />
        </>
      )}
    </Card>
  );
};

export default AccommodationsSection;
