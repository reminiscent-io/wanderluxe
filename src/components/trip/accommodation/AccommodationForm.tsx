import React, { useEffect, useState } from "react";
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
import HotelSearchInput from "./HotelSearchInput";
import HotelContactInfo from "./form/HotelContactInfo";
import LuxuryDateTimeRangePicker, {
  LuxuryDateTimeRange,
} from "@/components/ui/LuxuryDateTimeRangePicker";
import { AccommodationFormData } from "@/services/accommodation/accommodationService";
import { loadGoogleMapsAPI, getPlaceDetails } from "@/utils/googleMapsLoader";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { CURRENCIES, CURRENCY_NAMES } from "@/utils/currencyConstants";
import TravelersTagMultiSelect from "../travelers/TravelersTagMultiSelect";
import { getAccommodationTravelerIds, setAccommodationTravelers } from "@/services/travelers";

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
    is_paid: z.boolean(),
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
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */
const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({
  label: `${c} - ${CURRENCY_NAMES[c]}`,
  value: c,
}));

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
      // IMPORTANT: keep number/null here; don't coerce to string
      cost: initialData?.cost ?? null,
      currency: initialData?.currency ?? "USD",
      hotel_address: initialData?.hotel_address ?? "",
      hotel_phone: initialData?.hotel_phone ?? "",
      hotel_place_id: initialData?.hotel_place_id ?? "",
      hotel_website: initialData?.hotel_website ?? "",
      expense_type: "accommodation",
      is_paid: initialData?.is_paid ?? false,
      expense_date: initialData?.expense_date ?? "",
      order_index: initialData?.order_index ?? 0,
      travelers: [],
      stay_range:
        initialData?.hotel_checkin_date && initialData?.hotel_checkout_date
          ? {
              start: parse(
                initialData.hotel_checkin_date,
                "yyyy-MM-dd",
                new Date()
              ),
              end: parse(
                initialData.hotel_checkout_date,
                "yyyy-MM-dd",
                new Date()
              ),
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

  /* ----------------------------- Local state -------------------------- */
  const [hotelPhotos, setHotelPhotos] = useState<google.maps.places.PlacePhoto[]>([]);

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
  const stayRange = useWatch({
    control: form.control,
    name: "stay_range",
  }) as LuxuryDateTimeRange;

  useEffect(() => {
    if (stayRange?.start) {
      form.setValue("hotel_checkin_date", format(stayRange.start, "yyyy-MM-dd"), {
        shouldValidate: false,
      });
      form.setValue("checkin_time", stayRange.startTime ?? "15:00", {
        shouldValidate: false,
      });
    }
    if (stayRange?.end) {
      form.setValue("hotel_checkout_date", format(stayRange.end, "yyyy-MM-dd"), {
        shouldValidate: false,
      });
      form.setValue("checkout_time", stayRange.endTime ?? "11:00", {
        shouldValidate: false,
      });
    }
  }, [stayRange, form]);

  /* ------------------------------- FX ---------------------------------- */
  useEffect(() => {
    loadGoogleMapsAPI().catch(console.error);
  }, []);

  // When editing an existing stay with a place_id, fetch its photos once.
  useEffect(() => {
    const pid = form.getValues("hotel_place_id");
    if (!pid) return;
    (async () => {
      try {
        await loadGoogleMapsAPI();
        const details = await getPlaceDetails(pid, ["photos"]);
        setHotelPhotos(details?.photos ?? []);
      } catch {
        setHotelPhotos([]);
      }
    })();
    // only when initial place_id changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.hotel_place_id]);

  /* ---------------------- Load existing travelers --------------------- */
  useEffect(() => {
    if (initialData?.stay_id && tripId) {
      getAccommodationTravelerIds(tripId, initialData.stay_id.toString())
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
      const formData = { ...data };
      delete formData.travelers; // Remove travelers from form data as it's handled separately

      await onSubmit(formData);

      // Save traveler tags if we have a stay_id (for edit) or after successful creation
      if (initialData?.stay_id && data.travelers) {
        await setAccommodationTravelers(tripId, initialData.stay_id.toString(), data.travelers);
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
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-3 w-full max-w-none"
      >
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
                onChange={(val, d) => {
                  field.onChange(val);
                  if (d) {
                    form.setValue("hotel_address", d.formatted_address ?? "");
                    form.setValue(
                      "hotel_phone",
                      d.formatted_phone_number ?? ""
                    );
                    form.setValue("hotel_place_id", d.place_id ?? "");
                    form.setValue("hotel_website", d.website ?? "");
                    form.setValue("hotel_url", d.website ?? "");
                    // NEW: capture photos from Place Details
                    setHotelPhotos(d.photos ?? []);
                  }
                }}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Contact Preview */}
        <HotelContactInfo
          address={form.watch("hotel_address")}
          phone={form.watch("hotel_phone")}
        />

        {/* Photo strip: horizontally scrollable below address */}
        {hotelPhotos?.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-sand-600">Photos</div>
            <div className="-mx-1 overflow-x-auto">
              <div
                className="flex gap-2 px-1 snap-x snap-mandatory"
                role="list"
                aria-label="Hotel photos"
              >
                {hotelPhotos.slice(0, 12).map((p, idx) => {
                  const url = p.getUrl({ maxWidth: 640, maxHeight: 420 });
                  const attribution = p.html_attributions?.[0];
                  return (
                    <div
                      key={idx}
                      className="relative flex-none snap-start"
                      role="listitem"
                    >
                      <img
                        src={url}
                        alt={
                          form.watch("hotel")
                            ? `${form.watch("hotel")} photo ${idx + 1}`
                            : `Hotel photo ${idx + 1}`
                        }
                        className="h-28 w-44 rounded-md object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                      {attribution && (
                        <div
                          className="absolute bottom-1 right-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white"
                          // Google provides safe HTML for attribution links
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

        {/* Luxury Date + Time Picker */}
        <LuxuryDateTimeRangePicker
          name="stay_range"
          label="Stay Dates"
          required
          placeholder="Select check-in and check-out dates"
          defaultMonth={
            tripArrivalDate
              ? parse(tripArrivalDate, "yyyy-MM-dd", new Date())
              : undefined
          }
        />

        {/* Cost & Currency */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cost</FormLabel>
                <input
                  type="text"
                  value={field.value !== undefined && field.value !== null ? new Intl.NumberFormat('en-US').format(field.value) : ''}
                  onChange={(e) => {
                    const numericValue = Number(e.target.value.replace(/,/g, ''));
                    field.onChange(Number.isNaN(numericValue) ? null : numericValue);
                  }}
                  onBlur={(e) => {
                    // The field value is already set by onChange, this ensures visual formatting
                  }}
                  placeholder="0"
                  className="w-full rounded-md border p-2"
                />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency</FormLabel>
                <select {...field} className="w-full rounded-md border p-2">
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </FormItem>
            )}
          />
        </div>

        {/* Additional Details */}
        <FormField
          control={form.control}
          name="hotel_details"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Details</FormLabel>
              <textarea
                {...field}
                rows={1}
                className="w-full rounded-md border p-2"
              />
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

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4">
          <div>
            {initialData && onDelete && (
              <Button
                type="button"
                variant="ghost"
                disabled={saving}
                onClick={onDelete}
                className="text-red-500 hover:bg-red-50 hover:text-red-700 w-8 h-8 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-earth-500 text-white hover:bg-earth-600"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
