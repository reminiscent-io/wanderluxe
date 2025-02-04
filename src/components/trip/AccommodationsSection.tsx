import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import AccommodationHeader from './accommodation/AccommodationHeader';
import AccommodationActions from './accommodation/AccommodationActions';
import HotelStaysList from './accommodation/HotelStaysList';
import { formatDateRange } from '@/utils/dateUtils';
import { 
  addAccommodation, 
  updateAccommodation, 
  deleteAccommodation,
  AccommodationFormData 
} from '@/services/accommodation/accommodationService';

interface AccommodationsSectionProps {
  tripId: string;
  onAccommodationChange: () => void;
  hotelStays: Array<{
    id: string;
    hotel: string;
    hotel_details?: string;
    hotel_url?: string;
    hotel_checkin_date: string;
    hotel_checkout_date: string;
    expense_cost?: number;
    expense_currency?: string;
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
  const [isAddingAccommodation, setIsAddingAccommodation] = useState(false);
  const [editingStay, setEditingStay] = useState<string | null>(null);

  // Filter out duplicate hotel stays based on hotel name and dates
  const uniqueHotelStays = hotelStays.reduce((acc, current) => {
    const isDuplicate = acc.some(stay => 
      stay.hotel === current.hotel && 
      stay.hotel_checkin_date === current.hotel_checkin_date &&
      stay.hotel_checkout_date === current.hotel_checkout_date
    );
    
    if (!isDuplicate) {
      acc.push(current);
    }
    return acc;
  }, [] as typeof hotelStays);

  const handleSubmit = async (formData: AccommodationFormData) => {
    const success = await addAccommodation(tripId, formData);
    if (success) {
      setIsExpanded(false);
      setIsAddingAccommodation(false);
      onAccommodationChange();
    }
  };

  const handleUpdate = async (stayId: string, formData: AccommodationFormData) => {
    const success = await updateAccommodation(tripId, stayId, formData);
    if (success) {
      setEditingStay(null);
      onAccommodationChange();
    }
  };

  const handleDelete = async (stayId: string) => {
    const stay = uniqueHotelStays.find(s => s.id === stayId);
    if (!stay) return;

    const success = await deleteAccommodation(stay);
    if (success) {
      onAccommodationChange();
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
            hotelStays={uniqueHotelStays}
            onEdit={setEditingStay}
            onDelete={handleDelete}
            formatDateRange={formatDateRange}
          />

          <AccommodationActions
            isAddingAccommodation={isAddingAccommodation}
            setIsAddingAccommodation={setIsAddingAccommodation}
            editingStay={editingStay}
            onSubmit={editingStay 
              ? (formData) => handleUpdate(editingStay, formData)
              : handleSubmit
            }
            onCancel={() => editingStay ? setEditingStay(null) : setIsAddingAccommodation(false)}
            initialData={editingStay ? {
              hotel: uniqueHotelStays.find(s => s.id === editingStay)?.hotel || '',
              hotelDetails: uniqueHotelStays.find(s => s.id === editingStay)?.hotel_details || '',
              hotelUrl: uniqueHotelStays.find(s => s.id === editingStay)?.hotel_url || '',
              checkinDate: uniqueHotelStays.find(s => s.id === editingStay)?.hotel_checkin_date || '',
              checkoutDate: uniqueHotelStays.find(s => s.id === editingStay)?.hotel_checkout_date || '',
              expenseCost: uniqueHotelStays.find(s => s.id === editingStay)?.expense_cost?.toString() || '',
              expenseCurrency: uniqueHotelStays.find(s => s.id === editingStay)?.expense_currency || 'USD',
              hotelAddress: uniqueHotelStays.find(s => s.id === editingStay)?.hotel_address || '',
              hotelPhone: uniqueHotelStays.find(s => s.id === editingStay)?.hotel_phone || '',
              hotelPlaceId: uniqueHotelStays.find(s => s.id === editingStay)?.hotel_place_id || '',
              hotelWebsite: uniqueHotelStays.find(s => s.id === editingStay)?.hotel_website || ''
            } : undefined}
          />
        </div>
      )}
    </Card>
  );
};

export default AccommodationsSection;