import React, { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import RestaurantSearchInput from './RestaurantSearchInput';
import { Loader } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { loadGoogleMapsAPI } from '@/utils/googleMapsLoader';
import { CURRENCIES, CURRENCY_NAMES, CURRENCY_SYMBOLS } from '@/utils/currencyConstants';

// Define your form schema
const formSchema = z.object({
  restaurant_name: z.string().min(1, "Restaurant name is required"),
  address: z.string().optional(),
  phone_number: z.string().optional(),
  website: z.string().optional(),
  reservation_time: z.string().optional().nullable(),
  number_of_people: z.number().optional().nullable(),
  notes: z.string().optional(),
  cost: z.number().optional().nullable(),
  currency: z.string().optional().nullable(),
  place_id: z.string().optional(),
  rating: z.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface RestaurantReservationFormProps {
  onSubmit: (data: FormValues & { trip_id: string }) => void; 
  defaultValues?: Partial<FormValues> & { trip_id?: string };
  isSubmitting?: boolean;
  tripId: string; 
}

const RestaurantReservationForm: React.FC<RestaurantReservationFormProps> = ({
  onSubmit,
  defaultValues,
  isSubmitting = false,
  tripId,
}) => {
  console.log("RestaurantReservationForm received tripId:", tripId);
  
  // Correct state destructuring for Google Maps API loading status.
  const [setIsGoogleMapsLoaded] = useState(false);
  
  // Destructure the toast function from the custom hook.
  const { toast } = useToast();

  // Load Google Maps API.
  useEffect(() => {
    const loadAPI = async () => {
      try {
        const loaded = await loadGoogleMapsAPI();
        if (loaded) {
          setIsGoogleMapsLoaded(true);
        } else {
          toast('Failed to initialize restaurant search', { variant: 'error' });
        }
      } catch (error) {
        console.error('Error initializing Google Places:', error);
        toast('Failed to initialize restaurant search', { variant: 'error' });
      }
    };
    loadAPI();
  }, [toast]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      restaurant_name: '',
      reservation_time: null,
      number_of_people: undefined,
      notes: '',
      cost: undefined,
      currency: null,
      ...defaultValues,
    },
  });

  const handleSubmitForm = form.handleSubmit((data) => {
    // Use the tripId prop or a default from editing values if available.
    const effectiveTripId = tripId || defaultValues?.trip_id;
    if (!effectiveTripId) {
      console.error('Trip ID is required');
      return;
    }
    const processedData = {
      ...data,
      reservation_time: data.reservation_time === '' ? null : data.reservation_time,
      trip_id: effectiveTripId
    };
    onSubmit(processedData);
  });

  // Format cost on blur.
  const handleCostBlur = (value: string) => {
    const numericValue = Number(value.replace(/,/g, ''));
    if (!isNaN(numericValue)) {
      const formatted = new Intl.NumberFormat('en-US').format(numericValue);
      form.setValue('cost', numericValue);
      return formatted;
    }
    return value;
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmitForm} className="space-y-4">
        {/* Restaurant Name */}
        <FormField
          control={form.control}
          name="restaurant_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Restaurant Name <span className="text-red-500">*</span>
              </FormLabel>
              <RestaurantSearchInput
                autoFocus
                value={field.value}
                onChange={(name, details) => {
                  field.onChange(name);
                  if (details) {
                    form.setValue('address', details.formatted_address || '');
                    form.setValue('phone_number', details.formatted_phone_number || '');
                    form.setValue('website', details.website || '');
                    form.setValue('place_id', details.place_id || '');
                    form.setValue('rating', details.rating || 0);
                  }
                }}
              />
            </FormItem>
          )}
        />

        {/* Reservation Time */}
        <FormField
          control={form.control}
          name="reservation_time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Reservation Time <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <input
                  type="time"
                  value={field.value || ''}
                  onChange={field.onChange}
                  step="300" // 5-minute increments
                  className="w-full p-2 border rounded-md"
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Number of People */}
        <FormField
          control={form.control}
          name="number_of_people"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Number of People</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  className="bg-white"
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea {...field} className="bg-white" rows={1} />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Cost & Currency */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cost</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value)}
                    onBlur={(e) => {
                      const formatted = handleCostBlur(e.target.value);
                      field.onChange(Number(formatted.replace(/,/g, '')));
                    }}
                    className="bg-white"
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
                    value={field.value || ''}
                    className="bg-white mt-1 block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-earth-500 focus:ring-earth-500 sm:text-sm"
                  >
                    <option value="">Select currency</option>
                    {CURRENCIES.map(currency => (
                      <option key={currency} value={currency}>
                        {currency} {CURRENCY_SYMBOLS[currency]} - {CURRENCY_NAMES[currency]}
                      </option>
                    ))}
                  </select>
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <Button 
          type="submit" 
          disabled={isSubmitting} 
          className="w-full bg-sand-500 hover:bg-sand-600 text-white"
        >
          {isSubmitting ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Reservation'
          )}
        </Button>
      </form>
    </Form>
  );
};

export default RestaurantReservationForm;
