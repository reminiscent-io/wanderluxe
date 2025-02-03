import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Hotel, Calendar } from "lucide-react";
import AccommodationForm from './accommodation/AccommodationForm';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AccommodationsSectionProps {
  tripId: string;
  onAccommodationChange: () => void;
}

const AccommodationsSection: React.FC<AccommodationsSectionProps> = ({ tripId, onAccommodationChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);

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

  return (
    <div className="mb-8">
      <Button
        onClick={() => setIsExpanded(!isExpanded)}
        variant="outline"
        className="w-full justify-between mb-4 bg-white"
      >
        <div className="flex items-center gap-2">
          <Hotel className="h-4 w-4" />
          <span>Accommodations</span>
        </div>
        <Plus className="h-4 w-4" />
      </Button>

      {isExpanded && (
        <Card className="p-6">
          <AccommodationForm onSubmit={handleSubmit} onCancel={() => setIsExpanded(false)} />
        </Card>
      )}
    </div>
  );
};

export default AccommodationsSection;