import React from 'react';
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
import { CURRENCIES, CURRENCY_NAMES, CURRENCY_SYMBOLS } from '@/utils/currencyConstants';

// Converts blank / NaN values coming from <input type="number"> into undefined so they
// pass Zod's optional() validation.
const toNullableNumber = (val: unknown) => {
  if (val === '' || val === null || typeof val === 'undefined') return undefined;
  if (typeof val === 'number' && !Number.isNaN(val)) return val;
  const num = Number(val);
  return Number.isNaN(num) ? undefined : num;
};

// ────────────────────────────────────────────────────────────────────────────────
// Schema
// ────────────────────────────────────────────────────────────────────────────────
const formSchema = z.object({
  restaurant_name: z.string().min(1, "Restaurant name is required"),
  reservation_time: z.string().min(1, "Reservation time is required"),
  address: z.string().optional(),
  phone_number: z.string().optional(),
  website: z.string().optional(),
  number_of_people: z.preprocess(toNullableNumber, z.number().int().positive()).optional(),
  notes: z.string().optional(),
  cost: z.preprocess(toNullableNumber, z.number()).optional(),
  currency: z.string().optional().nullable(),
  place_id: z.string().optional(),
  rating: z.preprocess(toNullableNumber, z.number()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface RestaurantReservationFormProps {
  onSubmit: (data: FormValues & { trip_id: string }) => Promise<void>;
  defaultValues?: Partial<FormValues> & { trip_id?: string; day_id?: string; order_index?: number };
  isSubmitting?: boolean;
  tripId: string;
}

const RestaurantReservationForm: React.FC<RestaurantReservationFormProps> = ({
  onSubmit,
  defaultValues,
  isSubmitting = false,
  tripId,
}) => {
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      restaurant_name: '',
      reservation_time: '',
      number_of_people: undefined,
      notes: '',
      cost: undefined,
      currency: undefined,
      ...defaultValues,
    },
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Submit handler
  // ──────────────────────────────────────────────────────────────────────────────
  const handleSubmitForm = form.handleSubmit(async (data) => {
    console.log('RestaurantReservationForm - handleSubmitForm called with:', data);
    console.log('RestaurantReservationForm - form validation errors:', form.formState.errors);
    
    const effectiveTripId = tripId || defaultValues?.trip_id;
    if (!effectiveTripId) {
      console.log('RestaurantReservationForm - Missing trip ID');
      toast({
        variant: 'destructive',
        title: 'Missing trip',
        description: 'Trip ID is required to save this reservation.',
      });
      return;
    }

    const processedData = {
      ...data,
      trip_id: effectiveTripId,
      day_id: (defaultValues as any)?.day_id,
      order_index: (defaultValues as any)?.order_index ?? 0,
    };
    
    console.log('RestaurantReservationForm - processedData:', processedData);
    console.log('RestaurantReservationForm - About to call onSubmit prop');

    try {
      await onSubmit(processedData);
      console.log('RestaurantReservationForm - onSubmit completed successfully');
    } catch (err) {
      console.error('RestaurantReservationForm - onSubmit error:', err);
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: 'We could not save your reservation. Please try again.',
      });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────────
  const handleCostBlur = (value: string) => {
    const numericValue = Number(value.replace(/,/g, ''));
    if (!isNaN(numericValue)) {
      const formatted = new Intl.NumberFormat('en-US').format(numericValue);
      form.setValue('cost', numericValue);
      return formatted;
    }
    return value;
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // UI
  // ──────────────────────────────────────────────────────────────────────────────
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
                    form.setValue('rating', details.rating || undefined);
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
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const v = e.target.valueAsNumber;
                    field.onChange(Number.isNaN(v) ? undefined : v);
                  }}
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
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value)}
                    onBlur={(e) => {
                      const formatted = handleCostBlur(e.target.value);
                      field.onChange(
                        Number.isNaN(Number(formatted.replace(/,/g, '')))
                          ? undefined
                          : Number(formatted.replace(/,/g, ''))
                      );
                      e.target.value = formatted;
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
                    {CURRENCIES.map((currency) => (
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
