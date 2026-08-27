import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { reservationFormSchema, type ReservationFormValues } from './reservationFormSchema';
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
import { getJunctionTravelerIds, setJunctionTravelers } from '@/services/travelers';
import CurrencySelector from '../budget/CurrencySelector';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Globe, ChevronDown } from 'lucide-react';
import TimezoneSelect from '../_shared/TimezoneSelect';
import { useResolveTimezone } from '@/hooks/useResolveTimezone';
import { useTripTimezone } from '@/hooks/useTripTimezone';
import { defaultReservationEnd, durationMinutes, formatDurationShort } from '@/utils/timeUtils';

import {
  loadGoogleMapsAPI,
  getPlaceDetails,
  getPhotoUrl,
  type PlacePhotoMeta,
} from "@/utils/googleMapsLoader";

/* ------------------------------ helpers ------------------------------ */
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

  const viteKey: string | undefined =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_GOOGLE_MAPS_API_KEY) || undefined;

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

type FormValues = ReservationFormValues;

interface RestaurantReservationFormProps {
  onSubmit: (data: FormValues & { trip_id: string }) => Promise<void>;
  defaultValues?: Partial<FormValues> & { id?: string; trip_id?: string; day_id?: string; order_index?: number };
  isSubmitting?: boolean;
  onDelete?: () => Promise<void>;
  onCancel?: () => void;
  tripId: string;
  tripArrivalDate?: string;
  tripDepartureDate?: string;
  preselectedDate?: string; // Day the user clicked "Add to this day" on
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
  preselectedDate,
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
    // For a new reservation, default to the day the user clicked on
    if (!defaultValues?.id && preselectedDate) return preselectedDate;
    if (defaultValues?.day_id && tripDates.length > 0) return tripDates[0];
    return tripDates.length > 0 ? tripDates[0] : '';
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(reservationFormSchema),
    defaultValues: {
      restaurant_name: '',
      number_of_people: undefined,
      cost: undefined,
      currency: undefined,
      ...defaultValues,
      // A saved reservation stores NULL for anything the user left blank. These
      // back controlled inputs, so normalize before react-hook-form sees them —
      // a null here fails validation and blocks Save with no visible reason.
      reservation_time: defaultValues?.reservation_time ?? '',
      end_time: defaultValues?.end_time ?? '',
      notes: defaultValues?.notes ?? '',
      timezone: defaultValues?.timezone ?? null,
      reservation_date: getPreselectedDate(), // Smart date preselection
    },
  });

  /* ------------------------------ Google Maps init ------------------------------ */
  useEffect(() => {
    loadGoogleMapsAPI().catch(console.error);
  }, []);

  /* ------------------------------ Timezone auto-fill ---------------------------- */
  const [tzOpen, setTzOpen] = useState(false);
  const { tripTimezone } = useTripTimezone(tripId || defaultValues?.trip_id);
  const watchedPlaceId = form.watch('place_id');
  const { timeZoneId: placeTz } = useResolveTimezone(watchedPlaceId ?? null);
  // Existing zone on an edited reservation counts as a manual choice.
  const [tzTouched, setTzTouched] = useState(() => !!defaultValues?.timezone);

  // Pre-fill order: only the place's own zone auto-fills. No place zone means
  // no auto-fill — leave the value as-is so NULL correctly inherits the trip
  // default rather than materializing it onto the entity.
  useEffect(() => {
    if (tzTouched) return;
    if (!placeTz) return;
    if (placeTz !== (form.getValues('timezone') ?? null)) {
      form.setValue('timezone', placeTz);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeTz, tzTouched]);

  /* ------------------------------ End-time default ------------------------------ */
  // A dinner runs 90 minutes unless the user says otherwise. An end already on
  // the record counts as a manual choice, exactly like the timezone above — so
  // editing a reservation never silently rewrites an end the user picked.
  const [endTouched, setEndTouched] = useState(() => !!defaultValues?.end_time);

  const applyDefaultEnd = React.useCallback((startTime: string) => {
    if (endTouched) {
      // The end is the user's own; re-run the cross-field check so a stale
      // "must be after the start" error clears once they fix it from this side.
      if (form.getValues('end_time')) void form.trigger('end_time');
      return;
    }
    form.setValue('end_time', defaultReservationEnd(startTime) ?? '');
  }, [endTouched, form]);

  // Seed the default on mount too, so a reservation created before this field
  // existed — or one seeded with only a start from the calendar — picks it up.
  useEffect(() => {
    if (endTouched) return;
    const start = form.getValues('reservation_time');
    if (start && !form.getValues('end_time')) applyDefaultEnd(start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start and end read as one fact — how long the table is held — only once
  // both are set and the end is actually after the start.
  const watchedStart = form.watch('reservation_time');
  const watchedEnd = form.watch('end_time');
  const spanMinutes = durationMinutes(watchedStart, watchedEnd);
  const durationLabel = spanMinutes === null ? null : formatDurationShort(spanMinutes);

  /* ------------------- Track place_id changes ---------------------------------- */
  const [placeIdChanged, setPlaceIdChanged] = useState(false);

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
      getJunctionTravelerIds("reservation", tripId, defaultValues.id.toString())
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
    let finalDayId = (defaultValues as { day_id?: string } | undefined)?.day_id;

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

    const processedData: Record<string, unknown> = {
      ...dataWithout,
      // An emptied <input type="time"> yields '', which Postgres rejects for a
      // `time` column. NULL is the right shape for "no end stated".
      end_time: dataWithout.end_time || null,
      trip_id: effectiveTripId,
      day_id: finalDayId,
      order_index: (defaultValues as { order_index?: number } | undefined)?.order_index ?? 0,
    };
    // Clear the key photo when the restaurant location changed
    if (placeIdChanged) {
      processedData.image_url = null;
    }

    try {
      const result = await onSubmit(processedData);

      if (travelers && travelers.length > 0) {
        const reservationId = defaultValues?.id || (result as { id?: string } | null | undefined)?.id;
        if (reservationId) {
          await setJunctionTravelers("reservation", effectiveTripId, reservationId.toString(), travelers);
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
                onChange={(name, details) => {
                  field.onChange(name);
                  if (details) {
                    const newPlaceId = details.place_id || '';
                    const oldPlaceId = defaultValues?.place_id || '';
                    if (newPlaceId !== oldPlaceId) {
                      setPlaceIdChanged(true);
                    }
                    form.setValue('address', details.formatted_address || '');
                    form.setValue('phone_number', details.formatted_phone_number || '');
                    form.setValue('website', details.website || '');
                    form.setValue('place_id', newPlaceId);
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
                    if (defaultValues?.place_id) setPlaceIdChanged(true);
                    form.setValue('place_id', null);
                    form.setValue('website', null);
                    form.setValue('address', null);
                    form.setValue('phone_number', null);
                    form.setValue('rating', undefined as unknown as number);
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

        {/* Timezone (collapsible) */}
        <Collapsible open={tzOpen} onOpenChange={setTzOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-foreground bg-muted hover:bg-accent rounded-md border border-border transition-colors"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  Timezone{form.watch('timezone') ? `: ${form.watch('timezone')}` : ''}
                </span>
              </span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${tzOpen ? 'rotate-180' : ''}`} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <TimezoneSelect
              value={form.watch('timezone') ?? null}
              onChange={(tz) => { setTzTouched(true); form.setValue('timezone', tz); }}
              placeholder={tripTimezone ? `Trip default (${tripTimezone})` : 'Timezone'}
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Photo strip (side-scroll) */}
        {restaurantPhotos.length > 0 && (
          <div className="mt-2 space-y-2">
            <div className="text-xs text-sand-600">Photos</div>
            {/* No negative margin here: an auto-width block widened by -mx-1
                sticks 4px past the dialog's scroll container, and because
                `overflow-y: auto` forces the other axis to `auto` too, that
                4px is exactly what makes the sheet pan sideways on touch. The
                inner track's px-1 already supplies the gutter. */}
            <div className="overflow-x-auto">
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
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(attribution) }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Reservation Date & Time.

            One control per row on mobile. Mobile WebKit enforces a minimum
            width on a native time input, and half a phone is under it: the
            pair overflowed the sheet and the end time was clipped by the
            dialog's `overflow-x-hidden`. A row of its own clears that floor on
            any device at any text size. Side by side from sm up, where the
            600px dialog leaves each control ~270px — the old four-track row
            gave them ~107px, which was under the floor on desktop Safari too.

            `max-w` rather than a fixed width, because a time input stretched
            edge to edge reads as a broken text field but a *fixed* width is
            the thing WebKit overrides. Capped, an engine that insists on more
            simply renders wider, and a full row has the slack to absorb it. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="reservation_date"
            render={({ field }) => (
              <FormItem className="relative z-50 sm:col-span-2">
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
              <FormItem className="min-w-0">
                <FormLabel className="text-sm font-medium text-sand-700">
                  Start Time <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="time"
                    value={field.value || ''}
                    onChange={(e) => {
                      field.onChange(e);
                      applyDefaultEnd(e.target.value);
                    }}
                    step="300"
                    className="max-w-[12rem] bg-white border-sand-300 focus:ring-sand-500 focus:border-sand-500"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="end_time"
            render={({ field }) => (
              <FormItem className="min-w-0">
                {/* The readout sits outside the <label> on purpose: inside, it
                    would become part of the field's accessible name. */}
                <div className="flex items-baseline gap-2">
                  <FormLabel className="text-sm font-medium text-sand-700">End Time</FormLabel>
                  {durationLabel && (
                    <span className="text-xs text-sand-600">{durationLabel}</span>
                  )}
                </div>
                <FormControl>
                  <Input
                    type="time"
                    value={field.value || ''}
                    onChange={(e) => {
                      setEndTouched(true);
                      field.onChange(e.target.value);
                    }}
                    step="300"
                    className="max-w-[12rem] bg-white border-sand-300 focus:ring-sand-500 focus:border-sand-500"
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
              <FormItem className="w-20 min-w-0">
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
              <FormItem className="min-w-0 flex-1">
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
              <FormItem className="min-w-0 shrink-0">
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
                <Textarea {...field} value={field.value ?? ''} className="bg-white" rows={1} />
              </FormControl>
              <FormMessage />
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