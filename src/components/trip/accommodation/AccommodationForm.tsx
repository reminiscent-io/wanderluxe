
import React, { useState, useEffect, useMemo } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import HotelSearchInput from './HotelSearchInput';
import DateInputs from './form/DateInputs';
import CostInputs from './form/CostInputs';
import HotelOptionalDetails from './form/HotelOptionalDetails';
import HotelContactInfo from './form/HotelContactInfo';
import { AccommodationFormData } from '@/services/accommodation/types';
import { toast } from 'sonner';
import { loadGoogleMapsAPI } from '@/utils/googleMapsLoader';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  hotel: z.string().min(1, "Hotel name is required"),
  hotel_details: z.string().optional(),
  hotel_url: z.string().url().optional().or(z.literal('')),
  hotel_checkin_date: z.string().min(1, "Check-in date is required"),
  hotel_checkout_date: z.string().min(1, "Check-out date is required"),
  cost: z.number().nullable(),
  currency: z.string().min(1, "Currency is required"),
  hotel_address: z.string().optional(),
  hotel_phone: z.string().optional(),
  hotel_place_id: z.string().optional(),
  hotel_website: z.string().optional(),
  expense_type: z.literal('accommodation'),
  is_paid: z.boolean(),
  expense_date: z.string().optional(),
  order_index: z.number()
}).refine(data => {
  if (data.hotel_checkin_date && data.hotel_checkout_date) {
    return new Date(data.hotel_checkout_date) > new Date(data.hotel_checkin_date);
  }
  return true;
}, {
  message: "Check-out date must be after check-in date",
  path: ["hotel_checkout_date"]
});

interface AccommodationFormProps {
  onSubmit: (data: AccommodationFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: AccommodationFormData;
  tripArrivalDate?: string | null;
  tripDepartureDate?: string | null;
}

const CURRENCIES = [
  { label: 'USD - US Dollar', value: 'USD' },
  { label: 'EUR - Euro', value: 'EUR' },
  { label: 'GBP - British Pound', value: 'GBP' },
  { label: 'JPY - Japanese Yen', value: 'JPY' },
  { label: 'AUD - Australian Dollar', value: 'AUD' },
  { label: 'CAD - Canadian Dollar', value: 'CAD' }
];

const AccommodationForm: React.FC<AccommodationFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  tripArrivalDate,
  tripDepartureDate
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hotel: initialData?.hotel || '',
      hotel_details: initialData?.hotel_details || '',
      hotel_url: initialData?.hotel_url || '',
      hotel_checkin_date: initialData?.hotel_checkin_date || tripArrivalDate || '',
      hotel_checkout_date: initialData?.hotel_checkout_date || tripDepartureDate || '',
      cost: initialData?.cost || null,
      currency: initialData?.currency || 'USD',
      hotel_address: initialData?.hotel_address || '',
      hotel_phone: initialData?.hotel_phone || '',
      hotel_place_id: initialData?.hotel_place_id || '',
      hotel_website: initialData?.hotel_website || '',
      expense_type: 'accommodation',
      is_paid: initialData?.is_paid || false,
      expense_date: initialData?.expense_date || '',
      order_index: initialData?.order_index || 0
    }
  });

  useEffect(() => {
    loadGoogleMapsAPI();
  }, []);

  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      if (typeof onSubmit !== 'function') {
        throw new Error('onSubmit prop must be a function');
      }
      setIsSubmitting(true);
      await onSubmit(data);
    } catch (error) {
      console.error('Error submitting accommodation:', error);
      toast.error('Failed to save accommodation');
      throw error; // Re-throw to be handled by parent
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 p-6">
        <FormField
          control={form.control}
          name="hotel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hotel Name <span className="text-red-500">*</span></FormLabel>
              <HotelSearchInput
                value={field.value}
                onChange={(hotelName, placeDetails) => {
                  field.onChange(hotelName);
                  if (placeDetails) {
                    form.setValue('hotel_address', placeDetails.formatted_address || '');
                    form.setValue('hotel_phone', placeDetails.formatted_phone_number || '');
                    form.setValue('hotel_place_id', placeDetails.place_id || '');
                    form.setValue('hotel_website', placeDetails.website || '');
                    form.setValue('hotel_url', placeDetails.website || '');
                  }
                }}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <HotelContactInfo
          address={form.watch('hotel_address')}
          phone={form.watch('hotel_phone')}
        />

        <FormField
          control={form.control}
          name="hotel_details"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Details</FormLabel>
              <FormControl>
                <textarea
                  {...field}
                  className="w-full p-2 border rounded-md"
                  rows={3}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="hotel_checkin_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Check-in Date <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <input
                    type="date"
                    {...field}
                    className="w-full p-2 border rounded-md"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="hotel_checkout_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Check-out Date <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <input
                    type="date"
                    {...field}
                    className="w-full p-2 border rounded-md"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cost</FormLabel>
                <FormControl>
                  <input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    className="w-full p-2 border rounded-md"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency</FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className="w-full p-2 border rounded-md"
                  >
                    {CURRENCIES.map(currency => (
                      <option key={currency.value} value={currency.value}>
                        {currency.label}
                      </option>
                    ))}
                  </select>
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-earth-500 hover:bg-earth-600 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Accommodation'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default AccommodationForm;
