import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tables } from '@/integrations/supabase/types';
import { CURRENCIES, CURRENCY_NAMES, CURRENCY_SYMBOLS } from '@/utils/currencyConstants';

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
  // Local state for cost input to handle formatting on blur/focus
  const [costInput, setCostInput] = useState<string>(
    formData.cost !== undefined && formData.cost !== null ? formData.cost.toString() : ''
  );

  useEffect(() => {
    setCostInput(formData.cost !== undefined && formData.cost !== null ? formData.cost.toString() : '');
  }, [formData.cost]);

  const formatNumber = (value: number | null) => {
    if (value === null || isNaN(value)) return '';
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
  };

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
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent className="z-50 bg-sand-50">
            <SelectItem value="flight" className="cursor-pointer hover:bg-earth-100">Flight</SelectItem>
            <SelectItem value="train" className="cursor-pointer hover:bg-earth-100">Train</SelectItem>
            <SelectItem value="car_service" className="cursor-pointer hover:bg-earth-100">Car Service</SelectItem>
            <SelectItem value="shuttle" className="cursor-pointer hover:bg-earth-100">Shuttle</SelectItem>
            <SelectItem value="ferry" className="cursor-pointer hover:bg-earth-100">Ferry</SelectItem>
            <SelectItem value="rental_car" className="cursor-pointer hover:bg-earth-100">Rental Car</SelectItem>
            <SelectItem value="other" className="cursor-pointer hover:bg-earth-100">Other</SelectItem>
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

      {/* Removed the isDeparture and isArrival toggles */}

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
          value={costInput}
          onFocus={() => {
            setCostInput(formData.cost !== undefined && formData.cost !== null ? formData.cost.toString() : '');
          }}
          onChange={(e) => {
            const value = e.target.value.replace(/[^\d.-]/g, '');
            setCostInput(value);
            const cost = value ? parseFloat(value) : null;
            setFormData({ ...formData, cost });
          }}
          onBlur={() => {
            const formatted = formatNumber(formData.cost);
            setCostInput(formatted);
          }}
          placeholder="0"
        />
      </div>

      <div>
        <RequiredLabel>Currency</RequiredLabel>
        <Select
          value={formData.currency || 'USD'}
          onValueChange={(value) => setFormData({ ...formData, currency: value })}
        >
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="Select currency" />
          </SelectTrigger>
          <SelectContent className="z-50 bg-sand-50">
            {CURRENCIES.map((currency) => (
              <SelectItem
                key={currency}
                value={currency}
                className="cursor-pointer hover:bg-earth-100"
              >
                {currency} {CURRENCY_SYMBOLS[currency]} - {CURRENCY_NAMES[currency]}
              </SelectItem>
            ))}
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
