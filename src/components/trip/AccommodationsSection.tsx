import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Hotel, Calendar, ExternalLink, Pencil, Trash2 } from "lucide-react";
import AccommodationForm from './accommodation/AccommodationForm';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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

  const handleSubmit = async (formData: {
    hotel: string;
    hotelDetails: string;
    hotelUrl: string;
    checkinDate: string;
    checkoutDate: string;
    expenseCost: string;
    expenseCurrency: string;
  }) => {
    try {
      const finalAccommodationDay = new Date(formData.checkoutDate);
      finalAccommodationDay.setDate(finalAccommodationDay.getDate() - 1);
      
      const { error } = await supabase
        .from('timeline_events')
        .insert([{
          trip_id: tripId,
          date: formData.checkinDate,
          title: `Check-in: ${formData.hotel}`,
          hotel: formData.hotel,
          hotel_details: formData.hotelDetails,
          hotel_url: formData.hotelUrl,
          hotel_checkin_date: formData.checkinDate,
          hotel_checkout_date: formData.checkoutDate,
          expense_type: 'accommodation',
          expense_cost: formData.expenseCost ? Number(formData.expenseCost) : null,
          expense_currency: formData.expenseCurrency,
          final_accommodation_day: finalAccommodationDay.toISOString().split('T')[0],
          order_index: 0
        }]);

      if (error) throw error;

      toast.success('Accommodation added successfully');
      setIsExpanded(false);
      onAccommodationChange();
    } catch (error) {
      console.error('Error adding accommodation:', error);
      toast.error('Failed to add accommodation');
    }
  };

  const handleUpdate = async (stayId: string, formData: {
    hotel: string;
    hotelDetails: string;
    hotelUrl: string;
    checkinDate: string;
    checkoutDate: string;
    expenseCost: string;
    expenseCurrency: string;
  }) => {
    try {
      const finalAccommodationDay = new Date(formData.checkoutDate);
      finalAccommodationDay.setDate(finalAccommodationDay.getDate() - 1);

      const { error } = await supabase
        .from('timeline_events')
        .update({
          title: `Check-in: ${formData.hotel}`,
          hotel: formData.hotel,
          hotel_details: formData.hotelDetails,
          hotel_url: formData.hotelUrl,
          hotel_checkin_date: formData.checkinDate,
          hotel_checkout_date: formData.checkoutDate,
          expense_cost: formData.expenseCost ? Number(formData.expenseCost) : null,
          expense_currency: formData.expenseCurrency,
          final_accommodation_day: finalAccommodationDay.toISOString().split('T')[0],
        })
        .eq('id', stayId);

      if (error) throw error;

      toast.success('Accommodation updated successfully');
      setEditingStay(null);
      onAccommodationChange();
    } catch (error) {
      console.error('Error updating accommodation:', error);
      toast.error('Failed to update accommodation');
    }
  };

  const handleDelete = async (stayId: string) => {
    try {
      const { error } = await supabase
        .from('timeline_events')
        .delete()
        .eq('id', stayId);

      if (error) throw error;

      toast.success('Accommodation deleted successfully');
      onAccommodationChange();
    } catch (error) {
      console.error('Error deleting accommodation:', error);
      toast.error('Failed to delete accommodation');
    }
  };

  const formatDateRange = (checkinDate: string, checkoutDate: string) => {
    const checkin = new Date(checkinDate);
    const checkout = new Date(checkoutDate);
    return `${checkin.toLocaleDateString()} - ${checkout.toLocaleDateString()}`;
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
          {hotelStays.length > 0 && (
            <div className="space-y-4">
              {hotelStays.map((stay) => (
                <div 
                  key={stay.id}
                  className="flex items-start gap-4 p-4 bg-white rounded-lg shadow-sm"
                >
                  <Calendar className="h-5 w-5 text-gray-500 mt-1" />
                  <div className="flex-1">
                    {editingStay === stay.id ? (
                      <AccommodationForm 
                        onSubmit={(formData) => handleUpdate(stay.id, formData)}
                        onCancel={() => setEditingStay(null)}
                        initialData={{
                          hotel: stay.hotel,
                          hotelDetails: stay.hotel_details || '',
                          hotelUrl: stay.hotel_url || '',
                          checkinDate: stay.hotel_checkin_date,
                          checkoutDate: stay.hotel_checkout_date,
                          expenseCost: '',
                          expenseCurrency: 'USD'
                        }}
                      />
                    ) : (
                      <>
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">{stay.hotel}</h3>
                            <p className="text-sm text-gray-600">
                              {formatDateRange(stay.hotel_checkin_date, stay.hotel_checkout_date)}
                            </p>
                            {stay.hotel_details && (
                              <p className="text-sm text-gray-600 mt-1">{stay.hotel_details}</p>
                            )}
                            {stay.hotel_url && (
                              <a 
                                href={stay.hotel_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1"
                              >
                                View Hotel <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingStay(stay.id)}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(stay.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

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
        </div>
      )}
    </Card>
  );
};

export default AccommodationsSection;
