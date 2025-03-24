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

const RequiredLabel = ({ children }: { children: React.ReactNode }) => (
  <Label>
    {children} <span style={{ color: 'red' }}>*</span>
  </Label>
);

const TransportationFormFields: React.FC<TransportationFormFieldsProps> = ({
  formData,
  setFormData,
  formatCost
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <RequiredLabel>Transportation Type</RequiredLabel>
        <Select
          value={formData.type || ''}
          onValueChange={(value) => setFormData({ ...formData, type: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="flight">Flight</SelectItem>
            <SelectItem value="train">Train</SelectItem>
            <SelectItem value="car_service">Car Service</SelectItem>
            <SelectItem value="shuttle">Shuttle</SelectItem>
            <SelectItem value="ferry">Ferry</SelectItem>
            <SelectItem value="rental_car">Rental Car</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <RequiredLabel>From</RequiredLabel>
        <Input
          name="departure_location"
          value={formData.departure_location || ''}
          onChange={handleInputChange}
          placeholder="Departure location"
        />
      </div>

      <div>
        <RequiredLabel>To</RequiredLabel>
        <Input
          name="arrival_location"
          value={formData.arrival_location || ''}
          onChange={handleInputChange}
          placeholder="Arrival location"
        />
      </div>

      <div>
        <RequiredLabel>Departure Date</RequiredLabel>
        <Input
          type="date"
          name="start_date"
          value={formData.start_date || ''}
          onChange={handleInputChange}
        />
      </div>

      <div>
        <Label>Departure Time</Label>
        <Input
          type="time"
          name="start_time"
          value={formData.start_time || ''}
          onChange={handleInputChange}
        />
      </div>

      <div>
        <Label>Arrival Date</Label>
        <Input
          type="date"
          name="end_date"
          value={formData.end_date || ''}
          onChange={handleInputChange}
        />
      </div>

      <div>
        <Label>Arrival Time</Label>
        <Input
          type="time"
          name="end_time"
          value={formData.end_time || ''}
          onChange={handleInputChange}
        />
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center">
          <Label className="mr-2">Is Departure</Label>
          <Input
            type="checkbox"
            name="is_departure"
            checked={!!formData.is_departure}
            onChange={(e) => setFormData({ ...formData, is_departure: e.target.checked })}
          />
        </div>
        <div className="flex items-center">
          <Label className="mr-2">Is Arrival</Label>
          <Input
            type="checkbox"
            name="is_arrival"
            checked={!!formData.is_arrival}
            onChange={(e) => setFormData({ ...formData, is_arrival: e.target.checked })}
          />
        </div>
      </div>

      <div>
        <Label>Provider</Label>
        <Input
          name="provider"
          value={formData.provider || ''}
          onChange={handleInputChange}
          placeholder="Airline, train company, etc."
        />
      </div>

      <div>
        <Label>Confirmation Number</Label>
        <Input
          name="confirmation_number"
          value={formData.confirmation_number || ''}
          onChange={handleInputChange}
          placeholder="Booking reference"
        />
      </div>

      <div>
        <Label>Cost</Label>
        <Input
          name="cost"
          value={formatCost(formData.cost)}
          onChange={(e) => {
            const value = e.target.value.replace(/[^\d.-]/g, '');
            const cost = value ? parseFloat(value) : null;
            setFormData({ ...formData, cost });
          }}
          placeholder="0.00"
        />
      </div>

      <div>
        <RequiredLabel>Currency</RequiredLabel>
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
            <SelectItem value="CAD">CAD</SelectItem>
            <SelectItem value="AUD">AUD</SelectItem>
            <SelectItem value="JPY">JPY</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Details</Label>
        <Textarea
          name="details"
          value={formData.details || ''}
          onChange={handleInputChange}
          placeholder="Additional details"
          rows={3}
        />
      </div>
    </div>
  );
};

export default TransportationFormFields;
