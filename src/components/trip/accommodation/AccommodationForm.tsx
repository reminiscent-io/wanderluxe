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
import { loadGoogleMapsAPI } from "@/utils/googleMapsLoader";
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
    stay_range: z.any().optional(), // handled by component
    travelers: z.array(z.string()).optional(), // traveler IDs
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
        className="space-y-4 p-4 sm:p-6 relative max-w-full overflow-x-hidden"
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

        {/* Details */}
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
                  type="number"
                  {...field}
                  onChange={(e) => {
                    const n = e.target.value === "" ? null : e.target.valueAsNumber;
                    field.onChange(Number.isFinite(n as number) ? n : null);
                  }}
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

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
          {initialData && onDelete && (
            <Button
              type="button"
              variant="ghost"
              disabled={saving}
              onClick={onDelete}
              className="text-red-500 hover:bg-red-50 hover:text-red-700 w-full sm:w-auto"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}

          <div className="flex gap-2 sm:ml-auto">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={saving}
              className="flex-1 sm:flex-initial"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-earth-500 text-white hover:bg-earth-600 flex-1 sm:flex-initial"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save Accommodation"
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
