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
} from "@/components/ui/form";
import HotelSearchInput from "./HotelSearchInput";
import HotelContactInfo from "./form/HotelContactInfo";
import DateTimeRangeField, {
  DateTimeRange,
} from "@/components/ui/DateTimeRangeField";
import { AccommodationFormData } from "@/services/accommodation/accommodationService";
import { loadGoogleMapsAPI } from "@/utils/googleMapsLoader";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { CURRENCIES, CURRENCY_NAMES } from "@/utils/currencyConstants";

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
      is_paid: initialData?.is_paid ?? false,
      expense_date: initialData?.expense_date ?? "",
      order_index: initialData?.order_index ?? 0,
      stay_range:
        initialData?.hotel_checkin_date && initialData?.hotel_checkout_date
          ? {
              from: parse(initialData.hotel_checkin_date, "yyyy-MM-dd", new Date()),
              to: parse(initialData.hotel_checkout_date, "yyyy-MM-dd", new Date()),
              fromTime: initialData.checkin_time ?? "15:00",
              toTime: initialData.checkout_time ?? "11:00",
            }
          : undefined,
    },
  });

  /* --------------------- Sync picker → legacy fields ------------------ */
  const stayRange = useWatch({
    control: form.control,
    name: "stay_range",
  }) as DateTimeRange;

  useEffect(() => {
    if (stayRange?.from) {
      form.setValue(
        "hotel_checkin_date",
        format(stayRange.from, "yyyy-MM-dd"),
        { shouldValidate: false }
      );
      form.setValue(
        "checkin_time",
        stayRange.fromTime ?? "15:00",
        { shouldValidate: false }
      );
    }
    if (stayRange?.to) {
      form.setValue(
        "hotel_checkout_date",
        format(stayRange.to, "yyyy-MM-dd"),
        { shouldValidate: false }
      );
      form.setValue(
        "checkout_time",
        stayRange.toTime ?? "11:00",
        { shouldValidate: false }
      );
    }
  }, [stayRange, form]);

  /* ------------------------------- FX ---------------------------------- */
  useEffect(() => {
    loadGoogleMapsAPI().catch(console.error);
  }, []);

  /* ------------------------------ Submit ------------------------------- */
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (data: z.infer<typeof schema>) => {
    try {
      setSaving(true);
      await onSubmit(data);
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
        className="space-y-4 p-6"
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

        {/* Unified Date + Time Picker */}
        <DateTimeRangeField
          name="stay_range"
          label="Stay Dates"
          required
          defaultMonth={
            tripArrivalDate
              ? parse(tripArrivalDate, "yyyy-MM-dd", new Date())
              : undefined
          }
        />

        {/* Cost & Currency */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cost</FormLabel>
                <input
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
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
                <select
                  {...field}
                  className="w-full rounded-md border p-2"
                >
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

        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          {initialData && onDelete && (
            <Button
              type="button"
              variant="ghost"
              disabled={saving}
              onClick={onDelete}
              className="text-red-500 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}

          <div className="ml-auto flex gap-2">
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
                "Save Accommodation"
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}