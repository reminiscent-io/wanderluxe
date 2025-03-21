import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Tables } from '@/integrations/supabase/types';
import TransportationFormFields from './TransportationFormFields';

type TransportationEvent = Tables<'transportation_events'>;

interface TransportationFormProps {
  initialData?: Partial<TransportationEvent>;
  onSubmit: (data: Partial<TransportationEvent>) => void;
  onCancel: () => void;
  tripArrivalDate?: string | null;
  tripDepartureDate?: string | null;
}

const TransportationForm: React.FC<TransportationFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  tripArrivalDate,
  tripDepartureDate
}) => {
  const [formData, setFormData] = useState<Partial<TransportationEvent>>({
    type: 'flight',
    provider: '',
    details: '',
    confirmation_number: '',
    start_date: initialData?.start_date || tripArrivalDate || null,
    start_time: initialData?.start_time || '',
    end_date: initialData?.end_date || tripDepartureDate || null,
    end_time: initialData?.end_time || '',
    departure_location: '',
    arrival_location: '',
    cost: initialData?.cost ? Number(initialData.cost) : undefined,
    currency: 'USD',
    ...initialData
  });

  const formatCost = (value: number | undefined | null) => {
    if (value === undefined || value === null) return '';
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Clean date and time fields: convert empty strings to null
    const cleanedData = {
      ...formData,
      start_date: formData.start_date === '' ? null : formData.start_date,
      end_date: formData.end_date === '' ? null : formData.end_date,
      start_time: formData.start_time === '' ? null : formData.start_time,
      end_time: formData.end_time === '' ? null : formData.end_time,
    };

    onSubmit(cleanedData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <TransportationFormFields
        formData={formData}
        setFormData={setFormData}
        formatCost={formatCost}
      />

      <div className="flex justify-end gap-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          className="text-gray-600"
        >
          Cancel
        </Button>
        <Button 
          type="submit"
          className="bg-earth-500 hover:bg-earth-600 text-white"
        >
          {initialData ? 'Update' : 'Add'}
        </Button>
      </div>
    </form>
  );
};

export default TransportationForm;