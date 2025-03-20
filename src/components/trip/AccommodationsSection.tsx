import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import AccommodationHeader from './accommodation/AccommodationHeader';
import AccommodationActions from './accommodation/AccommodationActions';
import HotelStaysList from './accommodation/HotelStaysList';
import { formatDateRange } from '@/utils/dateUtils';
import { useAccommodationHandlers } from './accommodation/hooks/useAccommodationHandlers';
import { useTripDays } from '@/hooks/use-trip-days';
import type { HotelStay } from '@/types/trip';
import TransportationHeader from "./transportation/TransportationHeader"; // Added import
import TransportationDialog from "./transportation/TransportationDialog"; // Added import


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

  // Use the main useTripDays hook and get dates from its data
  const { days } = useTripDays(tripId);
  const tripDates = {
    arrival_date: days?.[0]?.date || null,
    departure_date: days?.[days?.length - 1]?.date || null
  };

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
        stay_id: stayToEdit.stay_id,
        hotel: stayToEdit.hotel,
        hotel_details: stayToEdit.hotel_details || '',
        hotel_url: stayToEdit.hotel_url || '',
        hotel_checkin_date: stayToEdit.hotel_checkin_date,
        hotel_checkout_date: stayToEdit.hotel_checkout_date,
        cost: stayToEdit.cost?.toString() || null,  // Optional cost
        currency: stayToEdit.currency,              // Optional currency
        hotel_address: stayToEdit.hotel_address || '',
        hotel_phone: stayToEdit.hotel_phone || '',
        hotel_place_id: stayToEdit.hotel_place_id,
        hotel_website: stayToEdit.hotel_website
      });
    }
  };

  // Sort hotel stays by check-in date in ascending order
  const sortedHotelStays = hotelStays.sort((a, b) =>
    new Date(a.hotel_checkin_date).getTime() - new Date(b.hotel_checkin_date).getTime()
  );

  return (
    <Card className="bg-sand-50 shadow-md">
      <div className="flex"> {/* Added div for flexbox layout */}
        <div className="flex-1"> {/* Added div to make elements take equal width */}
          <AccommodationHeader 
            isExpanded={isExpanded}
            onToggle={() => setIsExpanded(!isExpanded)}
          />
        </div>
        <div className="flex-1"> {/* Added div to make elements take equal width */}
          <TransportationHeader 
            isExpanded={isExpanded} 
            onToggle={() => setIsExpanded(!isExpanded)} /> {/* Added TransportationHeader */}
        </div>
      </div>

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