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
  // Use departure date for the start date and arrival date for the end date
  const defaultDepartureDate = tripDepartureDate || '';
  const defaultArrivalDate = tripArrivalDate || '';

  const [formData, setFormData] = useState<Partial<TransportationEvent>>({
    type: 'flight',
    provider: '',
    details: '',
    confirmation_number: '',
    start_date: initialData?.start_date || defaultDepartureDate,
    start_time: initialData?.start_time || '',
    end_date: initialData?.end_date || defaultArrivalDate,
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
    onSubmit(formData);
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
