import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Hotel } from "lucide-react";
import AccommodationForm from './accommodation/AccommodationForm';
import HotelStaysList from './accommodation/HotelStaysList';
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

  const formatDateRange = (checkinDate: string, checkoutDate: string) => {
    const checkin = new Date(checkinDate);
    const checkout = new Date(checkoutDate);
    
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    
    return `${checkin.toLocaleDateString(undefined, options)} - ${checkout.toLocaleDateString(undefined, options)}`;
  };

  const handleSubmit = async (formData: AccommodationFormData) => {
    const success = await addAccommodation(tripId, formData);
    if (success) {
      setIsExpanded(false);
      setIsAddingAccommodation(false);
      onAccommodationChange();
    }
  };

  const handleUpdate = async (stayId: string, formData: AccommodationFormData) => {
    console.log('Updating stay:', stayId, formData);
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
      <Button
        onClick={() => setIsExpanded(!isExpanded)}
        variant="ghost"
        className="w-full justify-between p-6 hover:bg-sand-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Hotel className="h-5 w-5" />
          <span className="text-lg font-medium">Accommodations</span>
        </div>
        <Plus className="h-5 w-5" />
      </Button>

      {isExpanded && (
        <div className="p-6 pt-0 space-y-6">
          <HotelStaysList
            hotelStays={uniqueHotelStays}
            onEdit={setEditingStay}
            onDelete={handleDelete}
            formatDateRange={formatDateRange}
          />

          {!editingStay && (
            <>
              {!isAddingAccommodation ? (
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
                    onSubmit={handleSubmit} 
                    onCancel={() => setIsAddingAccommodation(false)} 
                  />
                </Card>
              )}
            </>
          )}

          {editingStay && (
            <Card className="p-6 bg-white">
              <AccommodationForm 
                onSubmit={(formData) => handleUpdate(editingStay, formData)}
                onCancel={() => setEditingStay(null)}
                initialData={{
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
                }}
              />
            </Card>
          )}
        </div>
      )}
    </Card>
  );
};

export default AccommodationsSection;