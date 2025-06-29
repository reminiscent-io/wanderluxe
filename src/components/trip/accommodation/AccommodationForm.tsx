import React, { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import DateTimeRangeField from "@/components/ui/DateTimeRangeField";
import HotelSearchInput from "./HotelSearchInput";
import HotelContactInfo from "./form/HotelContactInfo";

import { AccommodationFormData } from "@/services/accommodation/accommodationService";
import { loadGoogleMapsAPI } from "@/utils/googleMapsLoader";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { CURRENCIES, CURRENCY_NAMES } from "@/utils/currencyConstants";

/* ---------------- validation schema ---------------- */
const schema = z
  .object({
    hotel: z.string().min(1, "Hotel name is required"),
    hotel_details: z.string().optional(),
    hotel_url: z.string().url().optional().or(z.literal("")),
    hotel_checkin_date: z.string().min(1, "Check-in date is required"),
    hotel_checkout_date: z.string().min(1, "Check-out date is required"),
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
    stay_range: z
      .object({ from: z.date().optional(), to: z.date().optional() })
      .optional(),
  })
  .refine(
    (d) =>
      new Date(d.hotel_checkout_date).getTime() >
      new Date(d.hotel_checkin_date).getTime(),
    {
      message: "Check-out must follow check-in",
      path: ["hotel_checkout_date"],
    },
  );

/* ---------------- props ---------------- */
interface Props {
  onSubmit: (d: AccommodationFormData) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
  initialData?: AccommodationFormData;
  tripArrivalDate?: string | null;
  tripDepartureDate?: string | null;
}

/* ---------------- helpers ---------------- */
const CURRENCY_OPTIONS = CURRENCIES.map((c) => ({
  label: `${c} - ${CURRENCY_NAMES[c]}`,
  value: c,
}));

/* ======================================================================== */
export default function AccommodationForm({
  onSubmit,
  onCancel,
  onDelete,
  initialData,
  tripArrivalDate,
  tripDepartureDate,
}: Props) {
  /* ----- form init ----- */
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
              from: new Date(initialData.hotel_checkin_date),
              to: new Date(initialData.hotel_checkout_date),
            }
          : undefined,
    },
  });

  /* watch the range picker */
  const stayRange = useWatch({
    control: form.control,
    name: "stay_range",
  }) as { from?: Date; to?: Date } | undefined;

  /* sync range → hidden string fields */
  useEffect(() => {
    if (stayRange?.from) {
      form.setValue(
        "hotel_checkin_date",
        format(stayRange.from, "yyyy-MM-dd"),
        { shouldValidate: false },
      );
    }
    if (stayRange?.to) {
      form.setValue(
        "hotel_checkout_date",
        format(stayRange.to, "yyyy-MM-dd"),
        { shouldValidate: false },
      );
    }
  }, [stayRange, form]);

  /* reset when parent trip dates change */
  useEffect(() => {
    if (!initialData && (tripArrivalDate || tripDepartureDate)) {
      form.reset({
        ...form.getValues(),
        hotel_checkin_date: tripArrivalDate ?? "",
        hotel_checkout_date: tripDepartureDate ?? "",
        stay_range:
          tripArrivalDate && tripDepartureDate
            ? {
                from: new Date(tripArrivalDate),
                to: new Date(tripDepartureDate),
              }
            : undefined,
      });
    }
  }, [tripArrivalDate, tripDepartureDate, initialData, form]);

  /* safely load Google Maps */
  useEffect(() => {
    loadGoogleMapsAPI().catch(console.error);
  }, []);

  /* ----- submit ----- */
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (data: z.infer<typeof schema>) => {
    try {
      setSaving(true);
      await onSubmit(data);
    } catch (e) {
      console.error(e);
      toast.error("Failed to save accommodation");
    } finally {
      setSaving(false);
    }
  };

  /* ----- JSX ----- */
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4 p-6"
      >
        {/* Hotel search */}
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
                onChange={(val, details) => {
                  field.onChange(val);
                  if (details) {
                    form.setValue(
                      "hotel_address",
                      details.formatted_address ?? "",
                    );
                    form.setValue(
                      "hotel_phone",
                      details.formatted_phone_number ?? "",
                    );
                    form.setValue("hotel_place_id", details.place_id ?? "");
                    form.setValue("hotel_website", details.website ?? "");
                    form.setValue("hotel_url", details.website ?? "");
                  }
                }}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        {/* contact preview */}
        <HotelContactInfo
          address={form.watch("hotel_address")}
          phone={form.watch("hotel_phone")}
        />

        {/* details */}
        <FormField
          control={form.control}
          name="hotel_details"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Details</FormLabel>
              <FormControl>
                <textarea
                  {...field}
                  rows={1}
                  className="w-full rounded-md border p-2"
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* calendar */}
        <DateTimeRangeField name="stay_range" label="Stay Dates" required />

        {/* times */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="checkin_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Check-in Time</FormLabel>
                <FormControl>
                  <input
                    type="time"
                    {...field}
                    className="w-full rounded-md border p-2"
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="checkout_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Check-out Time</FormLabel>
                <FormControl>
                  <input
                    type="time"
                    {...field}
                    className="w-full rounded-md border p-2"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* cost & currency */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cost</FormLabel>
                <FormControl>
                  <input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    className="w-full rounded-md border p-2"
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
                  <select {...field} className="w-full rounded-md border p-2">
                    {CURRENCY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* actions */}
        <div className="flex justify-between pt-4">
          {initialData && onDelete && (
            <Button
              type="button"
              variant="ghost"
              onClick={onDelete}
              disabled={saving}
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
              className="bg-earth-500 text-white hover:bg-earth-600"
              disabled={saving}
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
