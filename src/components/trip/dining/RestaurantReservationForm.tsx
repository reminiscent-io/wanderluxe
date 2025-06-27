import React from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RestaurantSearchInput from './RestaurantSearchInput';
import RestaurantContactInfo from './form/RestaurantContactInfo';
import { Loader } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { CURRENCIES, CURRENCY_NAMES, CURRENCY_SYMBOLS } from '@/utils/currencyConstants';
import { format } from "date-fns";

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
  reservation_date: z.string().min(1, "Reservation date is required"),
  reservation_time: z.string().min(1, "Reservation time is required"),
  address: z.string().optional(),
  phone_number: z.string().optional(),
  website: z.string().optional(),
  number_of_people: z.preprocess(toNullableNumber, z.number().int().positive().optional()),
  notes: z.string().optional(),
  cost: z.preprocess(toNullableNumber, z.number().optional()),
  currency: z.string().optional().nullable(),
  place_id: z.string().optional(),
  rating: z.preprocess(toNullableNumber, z.number().optional()),
});

type FormValues = z.infer<typeof formSchema>;

interface RestaurantReservationFormProps {
  onSubmit: (data: FormValues & { trip_id: string }) => Promise<void>;
  defaultValues?: Partial<FormValues> & { trip_id?: string; day_id?: string; order_index?: number };
  isSubmitting?: boolean;
  tripId: string;
  tripArrivalDate?: string;
  tripDepartureDate?: string;
}

const RestaurantReservationForm: React.FC<RestaurantReservationFormProps> = ({
  onSubmit,
  defaultValues,
  isSubmitting = false,
  tripId,
  tripArrivalDate,
  tripDepartureDate,
}) => {
  const { toast } = useToast();

  // Generate trip dates for dropdown with timezone-safe handling
  const generateTripDates = () => {
    if (!tripArrivalDate || !tripDepartureDate) return [];
    
    const dates = [];
    
    // Parse dates safely without timezone issues
    const [startYear, startMonth, startDay] = tripArrivalDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = tripDepartureDate.split('-').map(Number);
    
    const start = new Date(startYear, startMonth - 1, startDay);
    const end = new Date(endYear, endMonth - 1, endDay);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      dates.push(dateString);
    }
    
    return dates;
  };

  const tripDates = generateTripDates();

  // Smart date preselection logic
  const getPreselectedDate = () => {
    // If editing existing reservation, use its date
    if (defaultValues?.reservation_date) {
      return defaultValues.reservation_date;
    }
    
    // If adding from a specific day card, use that day's date
    if (defaultValues?.day_id && tripDates.length > 0) {
      // Find the day in trip dates that matches the day_id context
      // For now, default to first available date since we need day-to-date mapping
      return tripDates[0];
    }
    
    // Default to first available trip date
    return tripDates.length > 0 ? tripDates[0] : '';
  };

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
      reservation_date: getPreselectedDate(), // Smart date preselection
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
      <form onSubmit={handleSubmitForm} className="space-y-4 max-w-full overflow-hidden">
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

        <RestaurantContactInfo
          address={form.watch('address')}
          phone={form.watch('phone_number')}
          website={form.watch('website')}
          rating={form.watch('rating')}
        />

        {/* Reservation Date */}
        <FormField
          control={form.control}
          name="reservation_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Reservation Date <span className="text-red-500">*</span>
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a date" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {tripDates.map((date) => (
                    <SelectItem key={date} value={date}>
                      {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
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
                <Input
                  type="time"
                  value={field.value || ''}
                  onChange={field.onChange}
                  step="300" // 5-minute increments
                  className="bg-white"
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
          className="w-full bg-sand-500 hover:bg-sand-600 text-white disabled:opacity-50"
          onClick={(e) => {
            console.log('Save button clicked');
            console.log('Form state:', form.formState);
            console.log('Form values:', form.getValues());
            console.log('Form errors:', form.formState.errors);
          }}
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
