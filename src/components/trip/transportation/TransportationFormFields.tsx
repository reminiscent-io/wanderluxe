import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tables } from '@/integrations/supabase/types';

type TransportationEvent = Tables<'transportation_events'>;

interface TransportationFormFieldsProps {
  formData: Partial<TransportationEvent>;
  setFormData: (data: Partial<TransportationEvent>) => void;
  formatCost: (value: number | undefined | null) => string;
}

const TransportationFormFields: React.FC<TransportationFormFieldsProps> = ({
  formData,
  setFormData,
  formatCost
}) => {
  const handleCostChange = (value: string) => {
    // Remove any non-numeric characters except decimal point
    const numericValue = value.replace(/[^\d.]/g, '');
    
    // Ensure only one decimal point
    const parts = numericValue.split('.');
    const formattedValue = parts[0] + (parts.length > 1 ? '.' + parts[1].slice(0, 2) : '');
    
    // Convert to number for the formData
    const numberValue = parseFloat(formattedValue);
    if (!isNaN(numberValue)) {
      setFormData({ ...formData, cost: numberValue });
    } else if (value === '') {
      setFormData({ ...formData, cost: undefined });
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Type</Label>
          <Select
            value={formData.type || 'flight'}
            onValueChange={(value: any) => setFormData({ ...formData, type: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="flight">Flight</SelectItem>
              <SelectItem value="train">Train</SelectItem>
              <SelectItem value="car_service">Car Service</SelectItem>
              <SelectItem value="rental_car">Rental Car</SelectItem>
              <SelectItem value="shuttle">Shuttle</SelectItem>
              <SelectItem value="ferry">Ferry</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Provider (Optional)</Label>
          <Input
            value={formData.provider || ''}
            onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
            placeholder="e.g. United Airlines"
          />
        </div>
      </div>

      <div>
        <Label>Details (Optional)</Label>
        <Textarea
          value={formData.details || ''}
          onChange={(e) => setFormData({ ...formData, details: e.target.value })}
          placeholder="Add any additional details"
        />
      </div>

      <div>
        <Label>Confirmation Number (Optional)</Label>
        <Input
          value={formData.confirmation_number || ''}
          onChange={(e) => setFormData({ ...formData, confirmation_number: e.target.value })}
          placeholder="Enter confirmation number"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Departure Location</Label>
          <Input
            value={formData.departure_location || ''}
            onChange={(e) => setFormData({ ...formData, departure_location: e.target.value })}
            placeholder="From"
          />
        </div>
        <div>
          <Label>Arrival Location</Label>
          <Input
            value={formData.arrival_location || ''}
            onChange={(e) => setFormData({ ...formData, arrival_location: e.target.value })}
            placeholder="To"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Start Date</Label>
          <Input
            type="date"
            value={formData.start_date || ''}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
          />
        </div>
        <div>
          <Label>Start Time (Optional)</Label>
          <Input
            type="time"
            value={formData.start_time || ''}
            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>End Date (Optional)</Label>
          <Input
            type="date"
            value={formData.end_date || ''}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
          />
        </div>
        <div>
          <Label>End Time (Optional)</Label>
          <Input
            type="time"
            value={formData.end_time || ''}
            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Cost (Optional)</Label>
          <Input
            type="text"
            value={formData.cost !== undefined ? formData.cost.toString() : ''}
            onChange={(e) => handleCostChange(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div>
          <Label>Currency</Label>
          <Select
            value={formData.currency || 'USD'}
            onValueChange={(value) => setFormData({ ...formData, currency: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="GBP">GBP</SelectItem>
              <SelectItem value="JPY">JPY</SelectItem>
              <SelectItem value="AUD">AUD</SelectItem>
              <SelectItem value="CAD">CAD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default TransportationFormFields;