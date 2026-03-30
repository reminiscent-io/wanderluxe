import React, { useEffect, useState } from "react";
import DOMPurify from 'dompurify';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import { format, parse } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormControl,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import HotelSearchInput from "./HotelSearchInput";
import LuxuryDateTimeRangePicker, {
  LuxuryDateTimeRange,
} from "@/components/ui/LuxuryDateTimeRangePicker";
import { AccommodationFormData } from "@/services/accommodation/accommodationService";
import {
  loadGoogleMapsAPI,
  searchPlaces,
  getPlaceDetails,
  getPhotoUrl,
  type PlacePhotoMeta,
} from "@/utils/googleMapsLoader";
import { toast } from "sonner";
import { Trash2, ChevronDown, MapPin, Phone, Globe } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CURRENCIES, CURRENCY_NAMES } from "@/utils/currencyConstants";
import TravelersTagMultiSelect from "@/components/trip/travelers/TravelersTagMultiSelect";
import {
  getJunctionTravelerIds,
  setJunctionTravelers,
} from "@/services/travelers";

/* -------------------------------------------------------------------------- */
/* Schema                                                                     */
/* -------------------------------------------------------------------------- */
const schema = z
  .object({
    hotel: z.string().min(1, "Hotel name is required"),
    hotel_details: z.string().optional(),
    hotel_url: z.string().url().optional().or(z.literal("")),
    hotel_checkin_date: z.string(),
    hotel_checkout_date: z.string(),
    checkin_time: z.string().optional(),
    checkout_time: z.string().optional(),
    cost: z.number().nullable(),
    currency: z.string().min(1, "Currency is required"),
    hotel_address: z.string().optional(),
    hotel_phone: z.string().optional(),
    hotel_place_id: z.string().optional(),
    hotel_website: z.string().optional(),
    expense_type: z.literal("accommodation"),
    expense_date: z.string().optional(),
    order_index: z.number(),
    travelers: z.array(z.string()).optional(), // traveler IDs
    stay_range: z.any().optional(), // handled by component
  })
  .refine(
    (d) => new Date(d.hotel_checkout_date) > new Date(d.hotel_checkin_date),
    { path: ["hotel_checkout_date"], message: "Check-out must be after check-in" }
  );

/* -------------------------------------------------------------------------- */
/* Props                                                                      */
/* -------------------------------------------------------------------------- */
interface Props {
  onSubmit: (d: AccommodationFormData) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
  initialData?: AccommodationFormData;
  tripArrivalDate?: string | null;
  tripDepartureDate?: string | null;
  tripId: string;
  destination?: string; // Trip destination to bias search results
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */
const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({
  label: `${c} - ${CURRENCY_NAMES[c]}`,
  value: c,
}));

/** Resolve a usable image URL (prefer our proxy; fall back to direct Google endpoint only if a public key exists). */
const resolvePhotoUrl = (p: PlacePhotoMeta, maxWidth = 360): string | null => {
  const viaProxy = getPhotoUrl?.(p, maxWidth);
  if (viaProxy) return viaProxy;

  if (p.url) return p.url;

  // Optional fallback: direct Google photo endpoint if you’ve exposed a browser key (not required when proxy works)
  // eslint-disable-next-line no-undef
  const nextKey = typeof process !== "undefined"
    ? (process.env?.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string | undefined)
    : undefined;
  // @ts-ignore Vite env at runtime (SSR-safe check)
  const viteKey: string | undefined =
    (typeof import.meta !== "undefined" && (import.meta as any)?.env?.VITE_GOOGLE_MAPS_API_KEY) ||
    undefined;
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

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */
export default function AccommodationForm({
  onSubmit,
  onCancel,
  onDelete,
  initialData,
  tripArrivalDate,
  tripDepartureDate,
  tripId,
  destination,
}: Props) {
  /* ----------------------------- RHF init ----------------------------- */
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      hotel: initialData?.hotel ?? "",
      hotel_details: initialData?.hotel_details ?? "",
      hotel_url: initialData?.hotel_url ?? "",
      hotel_checkin_date:
        initialData?.hotel_checkin_date ?? tripArrivalDate ?? "",
      hotel_checkout_date:
        initialData?.hotel_checkout_date ?? tripDepartureDate ?? "",
      checkin_time: initialData?.checkin_time ?? "15:00",
      checkout_time: initialData?.checkout_time ?? "11:00",
      cost: initialData?.cost ?? null,
      currency: initialData?.currency ?? "USD",
      hotel_address: initialData?.hotel_address ?? "",
      hotel_phone: initialData?.hotel_phone ?? "",
      hotel_place_id: initialData?.hotel_place_id ?? "",
      hotel_website: initialData?.hotel_website ?? "",
      expense_type: "accommodation",
      expense_date: initialData?.expense_date ?? "",
      order_index: initialData?.order_index ?? 0,
      travelers: [],
      stay_range:
        initialData?.hotel_checkin_date && initialData?.hotel_checkout_date
          ? {
              start: parse(initialData.hotel_checkin_date, "yyyy-MM-dd", new Date()),
              end: parse(initialData.hotel_checkout_date, "yyyy-MM-dd", new Date()),
              startTime: initialData.checkin_time ?? "15:00",
              endTime: initialData.checkout_time ?? "11:00",
            }
          : tripArrivalDate && tripDepartureDate
          ? {
              start: parse(tripArrivalDate, "yyyy-MM-dd", new Date()),
              end: parse(tripDepartureDate, "yyyy-MM-dd", new Date()),
              startTime: "15:00",
              endTime: "11:00",
            }
          : undefined,
    },
  });

  /* -------------------- Reset form when trip dates arrive ------------- */
  useEffect(() => {
    if (
      !initialData &&
      tripArrivalDate &&
      tripDepartureDate &&
      !form.getValues("stay_range")
    ) {
      const newStayRange = {
        start: parse(tripArrivalDate, "yyyy-MM-dd", new Date()),
        end: parse(tripDepartureDate, "yyyy-MM-dd", new Date()),
        startTime: "15:00",
        endTime: "11:00",
      };
      form.setValue("stay_range", newStayRange);
      form.setValue("hotel_checkin_date", tripArrivalDate);
      form.setValue("hotel_checkout_date", tripDepartureDate);
    }
  }, [tripArrivalDate, tripDepartureDate, initialData, form]);

  /* --------------------- Sync picker → legacy fields ------------------ */
  const stayRange = useWatch({ control: form.control, name: "stay_range" }) as LuxuryDateTimeRange;

  useEffect(() => {
    if (stayRange?.start) {
      form.setValue("hotel_checkin_date", format(stayRange.start, "yyyy-MM-dd"), { shouldValidate: false });
      form.setValue("checkin_time", stayRange.startTime ?? "15:00", { shouldValidate: false });
    }
    if (stayRange?.end) {
      form.setValue("hotel_checkout_date", format(stayRange.end, "yyyy-MM-dd"), { shouldValidate: false });
      form.setValue("checkout_time", stayRange.endTime ?? "11:00", { shouldValidate: false });
    }
  }, [stayRange, form]);

  /* ------------------- Track place_id changes -------------------------- */
  const [placeIdChanged, setPlaceIdChanged] = useState(false);

  /* ------------------------------- FX ---------------------------------- */
  useEffect(() => {
    loadGoogleMapsAPI().catch(console.error); // no-op with proxy loader
  }, []);

  /* -------------------------- Hotel photos ----------------------------- */
  const [hotelPhotos, setHotelPhotos] = useState<PlacePhotoMeta[]>([]);

  /* ---------------------- Location details expand --------------------- */
  const [locationOpen, setLocationOpen] = useState(
    !!(initialData?.hotel_address || initialData?.hotel_phone || initialData?.hotel_website)
  );

  // Load photos for edit mode (when we already have a place_id)
  useEffect(() => {
    const pid = initialData?.hotel_place_id;
    if (!pid) return;
    getPlaceDetails(pid).then((res) => {
      if (res?.photos?.length) setHotelPhotos(res.photos);
    });
  }, [initialData?.hotel_place_id]);

  // Auto-resolve hotel name to Google Place when form opens with a name but no place_id
  // (e.g., from AI document extraction or AI chat recommendations)
  useEffect(() => {
    const hotelName = initialData?.hotel;
    const placeId = initialData?.hotel_place_id;

    // Only auto-resolve if we have a name but no place_id
    if (!hotelName || placeId) return;

    let cancelled = false;

    (async () => {
      try {
        const results = await searchPlaces(hotelName);
        if (cancelled || results.length === 0) return;

        const topMatch = results[0];
        const details = await getPlaceDetails(topMatch.place_id);
        if (cancelled || !details) return;

        // Populate form fields with resolved Google Place data
        form.setValue("hotel_place_id", details.place_id);
        form.setValue("hotel_address", details.formatted_address ?? "");
        form.setValue("hotel_phone", details.formatted_phone_number ?? "");
        form.setValue("hotel_website", details.website ?? "");
        if (details.website) {
          form.setValue("hotel_url", details.website);
        }

        // Auto-expand location details since we now have data
        if (details.formatted_address || details.formatted_phone_number || details.website) {
          setLocationOpen(true);
        }

        // Load photos
        if (details.photos?.length) {
          setHotelPhotos(details.photos);
        }
      } catch (err) {
        console.error("Auto-resolve hotel place failed:", err);
        // Fail silently — user can still manually search
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.hotel, initialData?.hotel_place_id, destination]);

  /* ---------------------- Load existing travelers --------------------- */
  useEffect(() => {
    if (initialData?.stay_id && tripId) {
      getJunctionTravelerIds("accommodation", tripId, initialData.stay_id.toString())
        .then(({ data }) => {
          if (data) {
            form.setValue("travelers", data);
          }
        })
        .catch(console.error);
    }
  }, [initialData?.stay_id, tripId, form]);

  /* ------------------------------ Submit ------------------------------- */
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (data: z.infer<typeof schema>) => {
    try {
      setSaving(true);
      const formData = { ...data, clear_image_url: placeIdChanged };
      delete (formData as any).travelers; // handled separately
      await onSubmit(formData);

      if (initialData?.stay_id && data.travelers) {
        await setJunctionTravelers("accommodation", tripId, initialData.stay_id.toString(), data.travelers);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save accommodation");
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------- JSX --------------------------------- */
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3 w-full">
        {/* Hotel Name */}
        <FormField
          control={form.control}
          name="hotel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Hotel Name <span className="text-red-500">*</span>
              </FormLabel>
              <HotelSearchInput
                value={field.value}
                onChange={(val, d: any) => {
                  field.onChange(val);
                  const newPlaceId = d?.place_id ?? "";
                  const oldPlaceId = initialData?.hotel_place_id ?? "";
                  if (newPlaceId !== oldPlaceId) {
                    setPlaceIdChanged(true);
                  }
                  // Basic details from picker (if present)
                  form.setValue("hotel_address", d?.formatted_address ?? "");
                  form.setValue("hotel_phone", d?.formatted_phone_number ?? "");
                  form.setValue("hotel_place_id", newPlaceId);
                  form.setValue("hotel_website", d?.website ?? "");
                  form.setValue("hotel_url", d?.website ?? "");

                  // Auto-expand location details when Google Places fills in data
                  if (d?.formatted_address || d?.formatted_phone_number || d?.website) {
                    setLocationOpen(true);
                  }

                  // Prefer photos that come with the selection; otherwise fetch details now to get photos.
                  if (Array.isArray(d?.photos) && d.photos.length) {
                    setHotelPhotos(d.photos as PlacePhotoMeta[]);
                  } else if (d?.place_id) {
                    getPlaceDetails(d.place_id)
                      .then((res) => setHotelPhotos(res?.photos ?? []))
                      .catch(() => setHotelPhotos([]));
                  } else {
                    setHotelPhotos([]);
                  }
                }}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Location Details (collapsible) */}
        <Collapsible open={locationOpen} onOpenChange={setLocationOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-sand-700 bg-sand-50 hover:bg-sand-100 rounded-md border border-sand-200 transition-colors"
            >
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-sand-500" />
                Location Details
              </span>
              <ChevronDown
                className={`h-4 w-4 text-sand-500 transition-transform duration-200 ${
                  locationOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-3">
            {/* Address */}
            <FormField
              control={form.control}
              name="hotel_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5 text-sand-600">
                    <MapPin className="h-3.5 w-3.5" />
                    Address
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      placeholder="Enter address"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone & Website row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="hotel_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 text-sand-600">
                      <Phone className="h-3.5 w-3.5" />
                      Phone
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="tel"
                        placeholder="Enter phone number"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hotel_website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 text-sand-600">
                      <Globe className="h-3.5 w-3.5" />
                      Website
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="url"
                        placeholder="https://..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Photo strip (side-scroll) */}
        {hotelPhotos.length > 0 && (
          <div className="mt-2 space-y-2">
            <div className="text-xs text-sand-600">Photos</div>
            <div className="overflow-x-auto rounded-md">
              <div className="flex gap-2 py-1 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {hotelPhotos.slice(0, 12).map((p, i) => {
                  // Offer progressively larger versions; min = 480px
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
                  ]
                    .filter(Boolean)
                    .join(", ");

                  // Match your Tailwind widths:
                  // mobile: w-72 = 288px, sm: w-96 = 384px, md: w-[28rem] = 448px
                  const sizes = "(min-width: 768px) 448px, (min-width: 640px) 384px, 288px";

                  const attribution = p.html_attributions?.[0];

                  return (
                    <div
                      key={`${p.photo_reference || p.url || i}`}
                      className="relative flex-none snap-start"
                    >
                      <img
                        src={src}
                        srcSet={srcSet}
                        sizes={sizes}
                        alt={`${form.watch("hotel") || "Hotel"} photo ${i + 1}`}
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

        {/* Luxury Date + Time Picker */}
        <LuxuryDateTimeRangePicker
          name="stay_range"
          label="Stay Dates"
          required
          placeholder="Select check-in and check-out dates"
          defaultMonth={tripArrivalDate ? parse(tripArrivalDate, "yyyy-MM-dd", new Date()) : undefined}
        />

        {/* Cost & Currency */}
        <div className="space-y-2">
          <FormLabel>Cost</FormLabel>
          <div className="flex gap-2">
            <FormField
              control={form.control}
              name="cost"
              render={({ field }) => (
                <FormItem className="flex-1 min-w-0">
                  <FormControl>
                    <Input
                      type="text"
                      value={
                        field.value !== undefined && field.value !== null
                          ? new Intl.NumberFormat("en-US").format(field.value)
                          : ""
                      }
                      onChange={(e) => {
                        const numericValue = Number(e.target.value.replace(/,/g, ""));
                        field.onChange(Number.isNaN(numericValue) ? null : numericValue);
                      }}
                      placeholder="0"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem className="w-24 shrink-0">
                  <FormControl>
                    <select
                      {...field}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      {CURRENCY_OPTIONS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.value}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Additional Details */}
        <FormField
          control={form.control}
          name="hotel_details"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Details</FormLabel>
              <FormControl>
                <Textarea {...field} rows={2} placeholder="Notes, confirmation number, etc." />
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
                <TravelersTagMultiSelect tripId={tripId} value={field.value || []} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="sticky bottom-0 z-10 bg-background flex justify-between items-center pt-4 -mt-px border-t border-sand-200">
          <div>
            {initialData && onDelete && (
              <Button
                type="button"
                variant="ghost"
                disabled={saving}
                onClick={onDelete}
                className="text-red-500 hover:text-red-600 hover:bg-red-50 w-9 h-9 p-0 border border-red-200 rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              disabled={saving}
              onClick={onCancel}
              className="px-5 py-2 text-sm font-medium text-sand-600 hover:text-sand-700 hover:bg-sand-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="px-6 py-2 text-sm font-semibold text-white bg-earth-600 hover:bg-earth-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
            >
              {saving ? "Saving..." : initialData ? "Update Stay" : "Add Stay"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
