import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface AccommodationFormProps {
  onSubmit: (data: {
    hotel: string;
    hotelDetails: string;
    hotelUrl: string;
    checkinDate: string;
    checkoutDate: string;
    expenseCost: string;
    expenseCurrency: string;
  }) => void;
  onCancel: () => void;
  initialData?: {
    hotel: string;
    hotelDetails: string;
    hotelUrl: string;
    checkinDate: string;
    checkoutDate: string;
    expenseCost: string | number;
    expenseCurrency: string;
  };
}

const AccommodationForm: React.FC<AccommodationFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const today = new Date().toISOString().split('T')[0];
  
  const [formData, setFormData] = useState({
    hotel: initialData?.hotel || '',
    hotelDetails: initialData?.hotelDetails || '',
    hotelUrl: initialData?.hotelUrl || '',
    checkinDate: initialData?.checkinDate || today,
    checkoutDate: initialData?.checkoutDate || '',
    expenseCost: initialData?.expenseCost ? initialData.expenseCost.toString() : '',
    expenseCurrency: initialData?.expenseCurrency || 'USD'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="hotel">Hotel Name *</Label>
        <Input
          id="hotel"
          value={formData.hotel}
          onChange={(e) => setFormData({ ...formData, hotel: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="hotelDetails">Details (Optional)</Label>
        <Textarea
          id="hotelDetails"
          value={formData.hotelDetails}
          onChange={(e) => setFormData({ ...formData, hotelDetails: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="hotelUrl">URL (Optional)</Label>
        <Input
          id="hotelUrl"
          type="url"
          value={formData.hotelUrl}
          onChange={(e) => setFormData({ ...formData, hotelUrl: e.target.value })}
          placeholder="https://..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="checkinDate">Check-in Date *</Label>
          <Input
            id="checkinDate"
            type="date"
            value={formData.checkinDate}
            onChange={(e) => setFormData({ ...formData, checkinDate: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="checkoutDate">Check-out Date *</Label>
          <Input
            id="checkoutDate"
            type="date"
            value={formData.checkoutDate}
            onChange={(e) => setFormData({ ...formData, checkoutDate: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="expenseCost">Total Cost</Label>
          <Input
            id="expenseCost"
            type="number"
            value={formData.expenseCost}
            onChange={(e) => setFormData({ ...formData, expenseCost: e.target.value })}
            placeholder="0.00"
          />
        </div>
        <div>
          <Label htmlFor="expenseCurrency">Currency</Label>
          <Input
            id="expenseCurrency"
            value={formData.expenseCurrency}
            onChange={(e) => setFormData({ ...formData, expenseCurrency: e.target.value })}
            placeholder="USD"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-earth-500 hover:bg-earth-600 text-white">
          {initialData ? 'Update' : 'Add Accommodation'}
        </Button>
      </div>
    </form>
  );
};

export default AccommodationForm;