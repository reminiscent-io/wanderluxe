import React, { useState, useEffect } from 'react';
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
import { Loader, Trash2 } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { CURRENCIES, CURRENCY_NAMES, CURRENCY_SYMBOLS } from '@/utils/currencyConstants';
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import TravelersTagMultiSelect from '../travelers/TravelersTagMultiSelect';
import { getReservationTravelerIds, setReservationTravelers } from '@/services/travelers';
import CurrencySelector from '../budget/CurrencySelector';

// Assuming CurrencySelector is imported and available in this scope.
// If it's not defined in the provided snippets, it's a placeholder for a custom component.
// For the purpose of this output, we'll assume it exists and works as expected.
// If CurrencySelector is not defined, this code would need that component to be provided.
// For example: import CurrencySelector from './CurrencySelector';

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
  address: z.string().optional().nullable(),
  phone_number: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  number_of_people: z.preprocess(toNullableNumber, z.number().int().positive().optional()),
  notes: z.string().optional(),
  cost: z.preprocess(toNullableNumber, z.number().optional()),
  currency: z.string().optional().nullable(),
  place_id: z.string().optional().nullable(),
  rating: z.preprocess(toNullableNumber, z.number().optional()),
  travelers: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface RestaurantReservationFormProps {
  onSubmit: (data: FormValues & { trip_id: string }) => Promise<void>;
  defaultValues?: Partial<FormValues> & { id?: string; trip_id?: string; day_id?: string; order_index?: number };
  isSubmitting?: boolean;
  onDelete?: () => Promise<void>;
  tripId: string;
  tripArrivalDate?: string;
  tripDepartureDate?: string;
}

const RestaurantReservationForm: React.FC<RestaurantReservationFormProps> = ({
  onSubmit,
  defaultValues,
  isSubmitting = false,
  onDelete,
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
  const [resolvedDate, setResolvedDate] = useState<string>('');

  // Smart date preselection logic
  const getPreselectedDate = () => {
    // If we've resolved the date from day_id lookup, use that
    if (resolvedDate) {
      return resolvedDate;
    }

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

  // Effect to fetch date from day_id when editing a reservation
  useEffect(() => {
    const fetchDateFromDayId = async () => {
      // Only fetch if we're editing (have an ID), have day_id but no reservation_date
      if (defaultValues?.id && defaultValues?.day_id && !defaultValues?.reservation_date) {
        try {
          const { data: tripDay, error } = await supabase
            .from('trip_days')
            .select('date')
            .eq('day_id', defaultValues.day_id)
            .single();

          if (!error && tripDay?.date) {
            setResolvedDate(tripDay.date);
            // Also update the form value directly
            form.setValue('reservation_date', tripDay.date);
          }
        } catch (error) {
          console.error('Failed to fetch date for day_id:', defaultValues.day_id, error);
        }
      }
    };

    fetchDateFromDayId();
  }, [defaultValues?.id, defaultValues?.day_id, defaultValues?.reservation_date, form]);

  // ──────────────────────────────────────────────────────────────────────────────
  // Load existing travelers
  // ──────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (defaultValues?.id && tripId) {
      getReservationTravelerIds(tripId, defaultValues.id.toString())
        .then(({ data }) => {
          if (data) {
            form.setValue("travelers", data);
          }
        })
        .catch(console.error);
    }
  }, [defaultValues?.id, tripId, form]);

  // ──────────────────────────────────────────────────────────────────────────────
  // Submit handler
  // ──────────────────────────────────────────────────────────────────────────────
  const handleSubmitForm = form.handleSubmit(async (data) => {


    const effectiveTripId = tripId || defaultValues?.trip_id;
    if (!effectiveTripId) {

      toast({
        variant: 'destructive',
        title: 'Missing trip',
        description: 'Trip ID is required to save this reservation.',
      });
      return;
    }

    // Lookup correct day_id based on selected reservation_date
    let finalDayId = (defaultValues as any)?.day_id;

    if (data.reservation_date && effectiveTripId) {


      const { data: tripDay, error: tripDayError } = await supabase
        .from('trip_days')
        .select('day_id')
        .eq('trip_id', effectiveTripId)
        .eq('date', data.reservation_date)
        .single();

      if (tripDayError || !tripDay) {
        console.error('Failed to find day_id for date:', data.reservation_date, tripDayError);
        toast({
          variant: 'destructive',
          title: 'Invalid date',
          description: 'Could not find the selected date in this trip.',
        });
        return;
      }


      finalDayId = tripDay.day_id;
    }

    // Remove reservation_date and travelers since they don't exist in the database - we use day_id and junction tables instead
    const { reservation_date, travelers, ...dataWithoutExtraFields } = data;

    const processedData = {
      ...dataWithoutExtraFields,
      trip_id: effectiveTripId,
      day_id: finalDayId,
      order_index: (defaultValues as any)?.order_index ?? 0,
    };



    try {
      const result = await onSubmit(processedData);

      // Save traveler tags if we have travelers selected
      if (travelers && travelers.length > 0) {
        const reservationId = defaultValues?.id || (result as any)?.id;
        if (reservationId) {
          await setReservationTravelers(effectiveTripId, reservationId.toString(), travelers);
        }
      }

    } catch (err) {
      console.error('Failed to save reservation:', err);
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
      <form onSubmit={handleSubmitForm} className="space-y-3 w-full max-w-none">
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

        {/* Reservation Date & Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <SelectContent className="z-[999]">
                    {tripDates.map((date) => {
                      // Parse date safely without timezone issues
                      const [year, month, day] = date.split('-').map(Number);
                      const safeDate = new Date(year, month - 1, day);
                      return (
                        <SelectItem key={date} value={date}>
                          {format(safeDate, 'EEEE, MMMM d, yyyy')}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

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
        </div>

        {/* Number of People, Cost & Currency */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                    placeholder="e.g., 2"
                    className="bg-white"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cost</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    value={field.value !== undefined ? new Intl.NumberFormat('en-US').format(field.value) : ''}
                    onChange={(e) => {
                      const numericValue = Number(e.target.value.replace(/,/g, ''));
                      field.onChange(Number.isNaN(numericValue) ? undefined : numericValue);
                    }}
                    onBlur={(e) => {
                      const formatted = handleCostBlur(e.target.value);
                      // The field value is already set by onChange, this just ensures visual formatting
                    }}
                    placeholder="0"
                    className="bg-white"
                  />
                </FormControl>
                <FormMessage />
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
                  <CurrencySelector
                    value={field.value}
                    onValueChange={field.onChange}
                    className="bg-white"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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

        {/* Travelers */}
        <FormField
          control={form.control}
          name="travelers"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tag Travelers</FormLabel>
              <FormControl>
                <TravelersTagMultiSelect
                  tripId={tripId}
                  value={field.value || []}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Buttons */}
        <div className="flex justify-between items-center pt-4">
          <div>
            {defaultValues?.id && onDelete && (
              <Button
                type="button"
                variant="ghost"
                onClick={onDelete}
                disabled={isSubmitting}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
          <div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-sand-500 hover:bg-sand-600 text-white disabled:opacity-50"
              onClick={(e) => {

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
          </div>
        </div>


      </form>
    </Form>
  );
};

// Assuming CurrencySelector component is defined elsewhere and imported.
// If not, you'll need to define or import it for this code to be fully functional.
// For example:
// const CurrencySelector = ({ value, onValueChange, className }: { value?: string; onValueChange?: (value: string) => void; className?: string }) => (
//   <Select onValueChange={onValueChange} value={value || ''}>
//     <FormControl>
//       <SelectTrigger className={className}>
//         <SelectValue placeholder="Select currency" />
//       </SelectTrigger>
//     </FormControl>
//     <SelectContent className="z-[999] max-h-48 overflow-y-auto">
//       {CURRENCIES.map((currency) => (
//         <SelectItem key={currency} value={currency}>
//           <span className="font-medium">{currency}</span>
//           <span className="ml-1 text-sand-600 text-sm">
//             {CURRENCY_SYMBOLS[currency]}
//           </span>
//         </SelectItem>
//       ))}
//     </SelectContent>
//   </Select>
// );

export default RestaurantReservationForm;