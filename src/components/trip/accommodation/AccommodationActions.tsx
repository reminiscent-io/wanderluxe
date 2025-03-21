import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { format, parseISO, isValid } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { AccommodationFormData } from '@/services/accommodation/accommodationService';
import { Plus, X } from 'lucide-react';

interface AccommodationActionsProps {
  isAddingAccommodation: boolean;
  setIsAddingAccommodation: (isAdding: boolean) => void;
  editingStay: AccommodationFormData | null;
  onSubmit: (data: AccommodationFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: AccommodationFormData | null;
  tripArrivalDate: string | null;
  tripDepartureDate: string | null;
}

const AccommodationActions: React.FC<AccommodationActionsProps> = ({
  isAddingAccommodation,
  setIsAddingAccommodation,
  editingStay,
  onSubmit,
  onCancel,
  initialData,
  tripArrivalDate,
  tripDepartureDate
}) => {
  const [formData, setFormData] = useState<AccommodationFormData>({
    hotel: '',
    hotel_details: '',
    hotel_address: '',
    hotel_phone: '',
    hotel_website: '',
    hotel_checkin_date: tripArrivalDate || new Date().toISOString(),
    hotel_checkout_date: tripDepartureDate || new Date().toISOString(),
    cost: '',
    currency: 'USD',
    hotel_place_id: null
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when editing state changes or when isAddingAccommodation changes
  useEffect(() => {
    if (editingStay) {
      console.log("Setting form with editing data:", editingStay);
      setFormData({
        hotel: editingStay.hotel || '',
        hotel_details: editingStay.hotel_details || '',
        hotel_address: editingStay.hotel_address || '',
        hotel_phone: editingStay.hotel_phone || '',
        hotel_website: editingStay.hotel_website || '',
        hotel_checkin_date: editingStay.hotel_checkin_date,
        hotel_checkout_date: editingStay.hotel_checkout_date,
        cost: editingStay.cost || '',
        currency: editingStay.currency || 'USD',
        hotel_place_id: editingStay.hotel_place_id || null
      });
    } else if (isAddingAccommodation) {
      // When adding new, use trip dates if available
      setFormData({
        hotel: '',
        hotel_details: '',
        hotel_address: '',
        hotel_phone: '',
        hotel_website: '',
        hotel_checkin_date: tripArrivalDate || new Date().toISOString(),
        hotel_checkout_date: tripDepartureDate || new Date().toISOString(),
        cost: '',
        currency: 'USD',
        hotel_place_id: null
      });
    }
  }, [editingStay, isAddingAccommodation, tripArrivalDate, tripDepartureDate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleDateChange = (date: Date | undefined, field: 'hotel_checkin_date' | 'hotel_checkout_date') => {
    if (date && isValid(date)) {
      const isoDate = date.toISOString();
      setFormData(prev => ({ ...prev, [field]: isoDate }));

      // Clear error for this field if it exists
      if (errors[field]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.hotel.trim()) {
      newErrors.hotel = 'Hotel name is required';
    }

    // Check if dates are valid
    try {
      const checkinDate = parseISO(formData.hotel_checkin_date);
      const checkoutDate = parseISO(formData.hotel_checkout_date);

      if (!isValid(checkinDate)) {
        newErrors.hotel_checkin_date = 'Invalid check-in date';
      }

      if (!isValid(checkoutDate)) {
        newErrors.hotel_checkout_date = 'Invalid check-out date';
      }

      if (isValid(checkinDate) && isValid(checkoutDate) && checkinDate >= checkoutDate) {
        newErrors.hotel_checkout_date = 'Check-out date must be after check-in date';
      }
    } catch (error) {
      console.error("Date validation error:", error);
      newErrors.dates = 'Invalid date format';
    }

    // Validate cost is a number if provided
    if (formData.cost && isNaN(parseFloat(formData.cost.toString()))) {
      newErrors.cost = 'Cost must be a number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(formData);
      setIsSubmitting(false);

      // Reset form and close
      if (!editingStay) {
        setIsAddingAccommodation(false);
      }
    } catch (error) {
      console.error("Error submitting accommodation form:", error);
      setIsSubmitting(false);
    }
  };

  // If not adding or editing, show the add button
  if (!isAddingAccommodation && !editingStay) {
    return (
      <div className="p-4 text-center">
        <Button 
          onClick={() => setIsAddingAccommodation(true)}
          className="bg-sand-600 hover:bg-sand-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Hotel Stay
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 rounded-b-lg border-t border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">
          {editingStay ? 'Edit Hotel Stay' : 'Add Hotel Stay'}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          className="text-gray-500"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="hotel">Hotel Name *</Label>
          <Input
            id="hotel"
            name="hotel"
            value={formData.hotel}
            onChange={handleInputChange}
            placeholder="Hotel name"
            className={errors.hotel ? "border-red-500" : ""}
          />
          {errors.hotel && (
            <p className="text-red-500 text-xs">{errors.hotel}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="hotel_checkin_date">Check-in Date *</Label>
            <DatePicker
              date={formData.hotel_checkin_date ? parseISO(formData.hotel_checkin_date) : undefined}
              onSelect={(date) => handleDateChange(date, 'hotel_checkin_date')}
              className={errors.hotel_checkin_date ? "border-red-500" : ""}
            />
            {errors.hotel_checkin_date && (
              <p className="text-red-500 text-xs">{errors.hotel_checkin_date}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="hotel_checkout_date">Check-out Date *</Label>
            <DatePicker
              date={formData.hotel_checkout_date ? parseISO(formData.hotel_checkout_date) : undefined}
              onSelect={(date) => handleDateChange(date, 'hotel_checkout_date')}
              className={errors.hotel_checkout_date ? "border-red-500" : ""}
            />
            {errors.hotel_checkout_date && (
              <p className="text-red-500 text-xs">{errors.hotel_checkout_date}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="hotel_address">Address</Label>
          <Input
            id="hotel_address"
            name="hotel_address"
            value={formData.hotel_address || ''}
            onChange={handleInputChange}
            placeholder="Hotel address"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="hotel_phone">Phone</Label>
            <Input
              id="hotel_phone"
              name="hotel_phone"
              value={formData.hotel_phone || ''}
              onChange={handleInputChange}
              placeholder="Phone number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="hotel_website">Website</Label>
            <Input
              id="hotel_website"
              name="hotel_website"
              value={formData.hotel_website || ''}
              onChange={handleInputChange}
              placeholder="Hotel website URL"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cost">Cost</Label>
            <Input
              id="cost"
              name="cost"
              type="text"
              value={formData.cost || ''}
              onChange={handleInputChange}
              placeholder="Amount"
              className={errors.cost ? "border-red-500" : ""}
            />
            {errors.cost && (
              <p className="text-red-500 text-xs">{errors.cost}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Input
              id="currency"
              name="currency"
              value={formData.currency || 'USD'}
              onChange={handleInputChange}
              placeholder="Currency (e.g., USD)"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="hotel_details">Additional Details</Label>
          <Textarea
            id="hotel_details"
            name="hotel_details"
            value={formData.hotel_details || ''}
            onChange={handleInputChange}
            placeholder="Additional details about this stay"
            rows={3}
          />
        </div>

        <div className="flex justify-end space-x-3 pt-2">
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
            className="bg-sand-600 hover:bg-sand-700 text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : editingStay ? 'Update Stay' : 'Add Stay'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AccommodationActions;