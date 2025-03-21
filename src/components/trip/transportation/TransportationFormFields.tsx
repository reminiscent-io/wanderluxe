
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
  const handleCostChange = (value: string) => {
    // Remove non-numeric characters except for decimal point
    const numericValue = value.replace(/[^\d.]/g, '');
    // Parse to float or null if empty
    const parsedValue = numericValue ? parseFloat(numericValue) : null;
    setFormData({ ...formData, cost: parsedValue });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <RequiredLabel>Type</RequiredLabel>
          <Select
            value={formData.type || ''}
            onValueChange={(value: TransportationEvent['type']) => setFormData({ ...formData, type: value })}
          >
            <SelectTrigger className="bg-white focus:ring-2 focus:ring-earth-500 focus:border-earth-500">
              <SelectValue placeholder="Select transportation type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="flight">Flight</SelectItem>
              <SelectItem value="train">Train</SelectItem>
              <SelectItem value="car_service">Car Service</SelectItem>
              <SelectItem value="rental_car">Rental Car</SelectItem>
              <SelectItem value="shuttle">Shuttle</SelectItem>
              <SelectItem value="ferry">Ferry</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <RequiredLabel>From</RequiredLabel>
          <Input
            value={formData.departure_location || ''}
            onChange={(e) => setFormData({ ...formData, departure_location: e.target.value })}
            placeholder="City, airport, station, etc."
            className="bg-white focus:ring-2 focus:ring-earth-500 focus:border-earth-500"
          />
        </div>

        <div>
          <RequiredLabel>To</RequiredLabel>
          <Input
            value={formData.arrival_location || ''}
            onChange={(e) => setFormData({ ...formData, arrival_location: e.target.value })}
            placeholder="City, airport, station, etc."
            className="bg-white focus:ring-2 focus:ring-earth-500 focus:border-earth-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <RequiredLabel>Departure Date</RequiredLabel>
            <Input
              type="date"
              value={formData.start_date || ''}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="bg-white focus:ring-2 focus:ring-earth-500 focus:border-earth-500"
            />
          </div>
          <div>
            <Label>Departure Time (Optional)</Label>
            <Input
              type="time"
              value={formData.start_time || ''}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              className="bg-white focus:ring-2 focus:ring-earth-500 focus:border-earth-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Arrival Date (Optional)</Label>
            <Input
              type="date"
              value={formData.end_date || ''}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="bg-white focus:ring-2 focus:ring-earth-500 focus:border-earth-500"
            />
          </div>
          <div>
            <Label>Arrival Time (Optional)</Label>
            <Input
              type="time"
              value={formData.end_time || ''}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
              className="bg-white focus:ring-2 focus:ring-earth-500 focus:border-earth-500"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Provider/Carrier (Optional)</Label>
          <Input
            value={formData.provider || ''}
            onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
            placeholder="Airline, train company, etc."
            className="bg-white focus:ring-2 focus:ring-earth-500 focus:border-earth-500"
          />
        </div>

        <div>
          <Label>Confirmation Number (Optional)</Label>
          <Input
            value={formData.confirmation_number || ''}
            onChange={(e) => setFormData({ ...formData, confirmation_number: e.target.value })}
            placeholder="Booking reference"
            className="bg-white focus:ring-2 focus:ring-earth-500 focus:border-earth-500"
          />
        </div>

        <div>
          <Label>Details (Optional)</Label>
          <Textarea
            value={formData.details || ''}
            onChange={(e) => setFormData({ ...formData, details: e.target.value })}
            placeholder="Flight number, seat information, etc."
            className="bg-white focus:ring-2 focus:ring-earth-500 focus:border-earth-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Cost (Optional)</Label>
            <Input
              type="text"
              value={formData.cost !== undefined ? formData.cost.toString() : ''}
              onChange={(e) => handleCostChange(e.target.value)}
              placeholder="0.00"
              className="bg-white focus:ring-2 focus:ring-earth-500 focus:border-earth-500"
            />
          </div>
          <div>
            <Label>Currency</Label>
            <Select
              value={formData.currency || 'USD'}
              onValueChange={(value: string) => setFormData({ ...formData, currency: value })}
            >
              <SelectTrigger className="bg-white focus:ring-2 focus:ring-earth-500 focus:border-earth-500">
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
    </div>
  );
};

export default TransportationFormFields;
