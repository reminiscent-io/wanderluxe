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
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import TravelersTagMultiSelect from '../travelers/TravelersTagMultiSelect';
import { getReservationTravelerIds, setReservationTravelers } from '@/services/travelers';
import CurrencySelector from '../budget/CurrencySelector';

import {
  loadGoogleMapsAPI,
  getPlaceDetails,
  getPhotoUrl,
  type PlacePhotoMeta,
} from "@/utils/googleMapsLoader";

/* ------------------------------ helpers ------------------------------ */
const toNullableNumber = (val: unknown) => {
  if (val === '' || val === null || typeof val === 'undefined') return undefined;
  if (typeof val === 'number' && !Number.isNaN(val)) return val;
  const num = Number(val);
  return Number.isNaN(num) ? undefined : num;
};

/** Prefer our proxy photo URL; fall back to direct Google endpoint only if a public key exists. */
const resolvePhotoUrl = (p: PlacePhotoMeta, maxWidth = 360): string | null => {
  const viaProxy = getPhotoUrl?.(p, maxWidth);
  if (viaProxy) return viaProxy;

  if (p.url) return p.url;

  // Optional fallback if a browser key is present
  const nextKey =
    typeof process !== "undefined"
      ? (process.env?.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string | undefined)
      : undefined;

  // @ts-ignore Vite env at runtime (SSR-safe check)
  const viteKey: string | undefined =
    (typeof import.meta !== "undefined" && (import.meta as any)?.env?.VITE_GOOGLE_MAPS_API_KEY) || undefined;

  const key = nextKey || viteKey;

  if (key && p.photo_reference) {
    const params = new URLSearchParams({
      maxwidth: String(maxWidth),
      photo_reference: p.photo_reference,
      key,
    });
    return `https://maps.googleapis.com/maps/api/place/photo?${params.toString()}`;
  }
  return null;
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
  number_of_people: z.preprocess(toNullableNumber, z.number().int().positive().optional().nullable()),
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
  onCancel?: () => void;
  tripId: string;
  tripArrivalDate?: string;
  tripDepartureDate?: string;
  destination?: string; // Trip destination to bias search results
}

const RestaurantReservationForm: React.FC<RestaurantReservationFormProps> = ({
  onSubmit,
  defaultValues,
  isSubmitting = false,
  onDelete,
  onCancel,
  tripId,
  tripArrivalDate,
  tripDepartureDate,
  destination,
}) => {
  const { toast } = useToast();

  // Generate trip dates for dropdown with timezone-safe handling
  const generateTripDates = () => {
    if (!tripArrivalDate || !tripDepartureDate) return [];

    const dates: string[] = [];

    const [startYear, startMonth, startDay] = tripArrivalDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = tripDepartureDate.split('-').map(Number);

    const start = new Date(startYear, startMonth - 1, startDay);
    const end = new Date(endYear, endMonth - 1, endDay);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }

    return dates;
  };

  const tripDates = generateTripDates();
  const [resolvedDate, setResolvedDate] = useState<string>('');

  // Smart date preselection logic
  const getPreselectedDate = () => {
    if (resolvedDate) return resolvedDate;
    if (defaultValues?.reservation_date) return defaultValues.reservation_date;
    if (defaultValues?.day_id && tripDates.length > 0) return tripDates[0];
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

  /* ------------------------------ Google Maps init ------------------------------ */
  useEffect(() => {
    loadGoogleMapsAPI().catch(console.error);
  }, []);

  /* ------------------------------ Photos state --------------------------------- */
  const [restaurantPhotos, setRestaurantPhotos] = useState<PlacePhotoMeta[]>([]);

  // Load photos for edit mode when a place_id already exists
  useEffect(() => {
    const pid = defaultValues?.place_id || undefined;
    if (!pid) return;
    getPlaceDetails(pid)
      .then((res) => {
        if (res?.photos?.length) setRestaurantPhotos(res.photos);
      })
      .catch(() => setRestaurantPhotos([]));
  }, [defaultValues?.place_id]);

  // Effect to fetch date from day_id when editing a reservation
  useEffect(() => {
    const fetchDateFromDayId = async () => {
      if (defaultValues?.id && defaultValues?.day_id && !defaultValues?.reservation_date) {
        try {
          const { data: tripDay, error } = await supabase
            .from('trip_days')
            .select('date')
            .eq('day_id', defaultValues.day_id)
            .single();

          if (!error && tripDay?.date) {
            setResolvedDate(tripDay.date);
            form.setValue('reservation_date', tripDay.date);
          }
        } catch (error) {
          console.error('Failed to fetch date for day_id:', defaultValues.day_id, error);
        }
      }
    };

    fetchDateFromDayId();
  }, [defaultValues?.id, defaultValues?.day_id, defaultValues?.reservation_date, form]);

  // Load existing travelers
  useEffect(() => {
    if (defaultValues?.id && tripId) {
      getReservationTravelerIds(tripId, defaultValues.id.toString())
        .then(({ data }) => {
          if (data) form.setValue("travelers", data);
        })
        .catch(console.error);
    }
  }, [defaultValues?.id, tripId, form]);

  // Submit handler
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

    // Remove reservation_date and travelers (db uses day_id and junction tables)
    const { reservation_date, travelers, ...dataWithout } = data;

    const processedData = {
      ...dataWithout,
      trip_id: effectiveTripId,
      day_id: finalDayId,
      order_index: (defaultValues as any)?.order_index ?? 0,
    };

    try {
      const result = await onSubmit(processedData);

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

  // Helpers
  const handleCostBlur = (value: string) => {
    const numericValue = Number(value.replace(/,/g, ''));
    if (!isNaN(numericValue)) {
      form.setValue('cost', numericValue);
      return new Intl.NumberFormat('en-US').format(numericValue);
    }
    return value;
  };

  // UI
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
                locationContext={destination}
                onChange={(name, details) => {
                  field.onChange(name);
                  if (details) {
                    form.setValue('address', details.formatted_address || '');
                    form.setValue('phone_number', details.formatted_phone_number || '');
                    form.setValue('website', details.website || '');
                    form.setValue('place_id', details.place_id || '');
                    form.setValue('rating', details.rating || undefined);

                    // Prefer picker-supplied photos; else fetch via Place Details
                    if (Array.isArray(details?.photos) && details.photos.length) {
                      setRestaurantPhotos(details.photos as PlacePhotoMeta[]);
                    } else if (details?.place_id) {
                      getPlaceDetails(details.place_id)
                        .then((res) => setRestaurantPhotos(res?.photos ?? []))
                        .catch(() => setRestaurantPhotos([]));
                    } else {
                      setRestaurantPhotos([]);
                    }
                  } else {
                    // Raw text entry (no place_id): just clear photo strip
                    setRestaurantPhotos([]);
                    form.setValue('place_id', null);
                    form.setValue('website', null);
                    form.setValue('address', null);
                    form.setValue('phone_number', null);
                    form.setValue('rating', undefined as any);
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

        {/* Photo strip (side-scroll) */}
        {restaurantPhotos.length > 0 && (
          <div className="mt-2 space-y-2">
            <div className="text-xs text-sand-600">Photos</div>
            <div className="-mx-1 overflow-x-auto">
              <div className="flex gap-2 px-1 py-1 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {restaurantPhotos.slice(0, 12).map((p, i) => {
                  const url480  = resolvePhotoUrl(p, 480);
                  const url720  = resolvePhotoUrl(p, 720);
                  const url896  = resolvePhotoUrl(p, 896);
                  const url1200 = resolvePhotoUrl(p, 1200);

                  const src = url720 || url896 || url1200 || url480;
                  if (!src) return null;

                  const srcSet = [
                    url480  && `${url480} 480w`,
                    url720  && `${url720} 720w`,
                    url896  && `${url896} 896w`,
                    url1200 && `${url1200} 1200w`,
                  ].filter(Boolean).join(", ");

                  const sizes = "(min-width: 768px) 448px, (min-width: 640px) 384px, 288px";
                  const attribution = p.html_attributions?.[0];

                  return (
                    <div key={`${p.photo_reference || p.url || i}`} className="relative flex-none snap-start">
                      <img
                        src={src}
                        srcSet={srcSet}
                        sizes={sizes}
                        alt={`${form.watch("restaurant_name") || "Restaurant"} photo ${i + 1}`}
                        className="
                          h-48 w-72
                          sm:h-64 sm:w-96
                          md:h-64 md:w-[28rem]
                          rounded-md object-cover border border-sand-200
                        "
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                      />
                      {attribution && (
                        <div
                          className="absolute bottom-1 right-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white"
                          dangerouslySetInnerHTML={{ __html: attribution }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Reservation Date & Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="reservation_date"
            render={({ field }) => (
              <FormItem className="relative z-50">
                <FormLabel>
                  Reservation Date <span className="text-red-500">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="relative z-50">
                      <SelectValue placeholder="Select a date" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="z-[9999] min-w-[200px] max-h-[300px]">
                    {tripDates.map((date) => {
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
                <FormLabel className="text-sm font-medium text-sand-700">
                  Reservation Time <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="time"
                    value={field.value || ''}
                    onChange={field.onChange}
                    step="300"
                    className="bg-white border-sand-300 focus:ring-sand-500 focus:border-sand-500 max-w-[150px] sm:max-w-full"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Party Size, Cost & Currency - Single Row */}
        <div className="flex gap-3 items-end">
          <FormField
            control={form.control}
            name="number_of_people"
            render={({ field }) => (
              <FormItem className="w-20">
                <FormLabel>Party Size</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "") {
                        field.onChange(null);
                      } else {
                        const num = parseInt(v, 10);
                        field.onChange(isNaN(num) ? null : num);
                      }
                    }}
                    placeholder="2"
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
              <FormItem className="flex-1">
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
                      handleCostBlur(e.target.value);
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
              <FormItem className="shrink-0">
                <FormControl>
                  <CurrencySelector
                    value={field.value || 'USD'}
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
              <FormLabel>Travelers</FormLabel>
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
        <div className="sticky bottom-0 z-10 bg-background flex justify-between items-center pt-4 -mt-px border-t border-sand-200">
          <div>
            {defaultValues?.id && onDelete && (
              <Button
                type="button"
                variant="ghost"
                onClick={onDelete}
                disabled={isSubmitting}
                className="text-red-500 hover:text-red-600 hover:bg-red-50 w-9 h-9 p-0 border border-red-200 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-5 py-2 text-sm font-medium text-sand-600 hover:text-sand-700 hover:bg-sand-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 text-sm font-semibold text-white bg-earth-600 hover:bg-earth-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
};

export default RestaurantReservationForm;