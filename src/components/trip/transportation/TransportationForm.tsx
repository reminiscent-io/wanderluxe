import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Tables } from '@/integrations/supabase/types';
import TransportationFormFields from './TransportationFormFields';
import { toast } from 'sonner';

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
  const defaultData: Partial<TransportationEvent> = {
    type: '',
    departure_location: '',
    arrival_location: '',
    start_date: tripArrivalDate || '',
    start_time: '',
    end_date: '',
    end_time: '',
    provider: '',
    details: '',
    confirmation_number: '',
    cost: null,
    currency: 'USD'
  };

  const [formData, setFormData] = useState<Partial<TransportationEvent>>(
    initialData || defaultData
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatCost = (value: number | undefined | null): string => {
    if (value === undefined || value === null) return '';
    return value.toString();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate required fields
    if (!formData.type) {
      toast.error('Please select a transportation type');
      setIsSubmitting(false);
      return;
    }

    if (!formData.departure_location) {
      toast.error('Please enter a departure location');
      setIsSubmitting(false);
      return;
    }

    if (!formData.arrival_location) {
      toast.error('Please enter an arrival location');
      setIsSubmitting(false);
      return;
    }

    if (!formData.start_date) {
      toast.error('Please select a departure date');
      setIsSubmitting(false);
      return;
    }

    if (!formData.currency) {
      setFormData({ ...formData, currency: 'USD' });
    }

    onSubmit(formData);
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <TransportationFormFields
        formData={formData}
        setFormData={setFormData}
        formatCost={formatCost}
      />

      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-earth-600 hover:bg-earth-700 text-white"
        >
          {initialData ? 'Update Transportation' : 'Add Transportation'}
        </Button>
      </div>
    </form>
  );
};

export default TransportationForm;