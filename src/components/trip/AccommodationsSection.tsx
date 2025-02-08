
import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import AccommodationHeader from './accommodation/AccommodationHeader';
import AccommodationActions from './accommodation/AccommodationActions';
import HotelStaysList from './accommodation/HotelStaysList';
import { formatDateRange } from '@/utils/dateUtils';
import { useAccommodationHandlers } from './accommodation/hooks/useAccommodationHandlers';
import { useTripDates } from './accommodation/hooks/useTripDates';
import { HotelStay } from '@/services/accommodation/types';

interface AccommodationsSectionProps {
  tripId: string;
  onAccommodationChange: () => void;
  hotelStays: Array<{
    stay_id: string;
    hotel: string;
    hotel_details?: string;
    hotel_url?: string;
    hotel_checkin_date: string;
    hotel_checkout_date: string;
    expense_cost?: number;
    currency?: string;
    hotel_address?: string;
    hotel_phone?: string;
    hotel_place_id?: string;
    hotel_website?: string;
  }>;
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
        expense_cost: stayToEdit.expense_cost?.toString() || ''
      });
    }
  };

  return (
    <Card className="bg-sand-50 shadow-md">
      <AccommodationHeader 
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
      />

      {isExpanded && (
        <div className="p-6 pt-0 space-y-6">
          <HotelStaysList
            hotelStays={hotelStays}
            onEdit={handleEdit}
            onDelete={(stay) => handleDelete({ 
              stay_id: stay.stay_id,
              hotel: stay.hotel,
              hotel_checkin_date: stay.hotel_checkin_date,
              hotel_checkout_date: stay.hotel_checkout_date
            })}
            formatDateRange={formatDateRange}
          />

          <AccommodationActions
            isAddingAccommodation={isAddingAccommodation}
            setIsAddingAccommodation={setIsAddingAccommodation}
            editingStay={editingStay}
            onSubmit={editingStay 
              ? (formData) => handleUpdate(editingStay.stay_id, formData)
              : handleSubmit
            }
            onCancel={() => editingStay ? setEditingStay(null) : setIsAddingAccommodation(false)}
            initialData={editingStay || undefined}
            tripArrivalDate={tripDates.arrival_date}
            tripDepartureDate={tripDates.departure_date}
          />
        </div>
      )}
    </Card>
  );
};

export default AccommodationsSection;
