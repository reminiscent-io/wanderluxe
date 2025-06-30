// src/components/trip/transportation/TransportationForm.tsx
import React, { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import TransportationFormFields from "./TransportationFormFields";
import { DateTimeRange } from "@/components/ui/DateTimeRangeField";
import { CURRENCIES } from "@/utils/currencyConstants";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type Transportation = Tables<"transportation">;

interface Props {
  initialData?: Partial<Transportation>;
  onSubmit: (data: Partial<Transportation>) => Promise<void> | void;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
  tripArrivalDate?: string | null;
  tripDepartureDate?: string | null;
  buttonClassName?: string;
}

export default function TransportationForm({
  initialData,
  onSubmit,
  onCancel,
  onDelete,
  tripArrivalDate,
  tripDepartureDate,
  buttonClassName,
}: Props) {
  /* ---------------------------------- schema --------------------------------- */
  const schema = z.object({
    type: z.string().min(1),
    departure_location: z.string().min(1),
    arrival_location: z.string().min(1),
    travel_range: z.any().optional(),
    provider: z.string().optional(),
    details: z.string().optional(),
    confirmation_number: z.string().optional(),
    cost: z.number().nullable(),
    currency: z.string().min(1),
  });

  /* ---------------------------------- RHF init -------------------------------- */
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: initialData?.type ?? "flight",
      departure_location: initialData?.departure_location ?? "",
      arrival_location: initialData?.arrival_location ?? "",
      travel_range:
        initialData?.start_date && initialData?.end_date
          ? {
              from: new Date(initialData.start_date),
              to: new Date(initialData.end_date),
              fromTime: initialData.start_time ?? "",
              toTime: initialData.end_time ?? "",
            }
          : undefined,
      provider: initialData?.provider ?? "",
      details: initialData?.details ?? "",
      confirmation_number: initialData?.confirmation_number ?? "",
      cost: initialData?.cost ?? null,
      currency: initialData?.currency ?? CURRENCIES[0],
    },
  });

  /* ------------------- reset on trip-date change ------------------- */
  useEffect(() => {
    if (!initialData && (tripArrivalDate || tripDepartureDate)) {
      const current = form.getValues();
      form.reset({
        ...current,
        travel_range:
          tripArrivalDate || tripDepartureDate
            ? {
                from: tripArrivalDate
                  ? new Date(tripArrivalDate)
                  : current.travel_range?.from,
                to: tripDepartureDate
                  ? new Date(tripDepartureDate)
                  : current.travel_range?.to,
                fromTime: current.travel_range?.fromTime,
                toTime: current.travel_range?.toTime,
              }
            : undefined,
      });
    }
  }, [tripArrivalDate, tripDepartureDate, initialData, form]);

  /* ------------------ watch the range ------------------ */
  const travelRange = useWatch({
    control: form.control,
    name: "travel_range",
  }) as DateTimeRange;

  /* ------------------- submit handler ------------------- */
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (data: z.infer<typeof schema>) => {
    if (!travelRange?.from || !travelRange?.to) {
      toast.error("Please select departure and arrival dates");
      return;
    }

    const payload: Partial<Transportation> = {
      ...initialData,
      type: data.type,
      departure_location: data.departure_location,
      arrival_location: data.arrival_location,
      provider: data.provider,
      details: data.details,
      confirmation_number: data.confirmation_number,
      cost: data.cost,
      currency: data.currency,
      start_date: format(travelRange.from, "yyyy-MM-dd"),
      end_date: format(travelRange.to, "yyyy-MM-dd"),
      start_time: travelRange.fromTime || null,
      end_time: travelRange.toTime || null,
    };

    try {
      setSaving(true);
      await onSubmit(payload);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save transportation");
    } finally {
      setSaving(false);
    }
  };

  /* ----------------------------------- JSX ----------------------------------- */
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <TransportationFormFields
          form={form}
          tripArrivalDate={tripArrivalDate}
        />

        <div className="flex items-center justify-between pt-4">
          {initialData && onDelete && (
            <Button
              type="button"
              variant="ghost"
              onClick={onDelete}
              disabled={saving}
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}

          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className={`bg-earth-400 text-white font-semibold hover:bg-earth-600 ${
                buttonClassName ?? ""
              }`}
            >
              {initialData ? "Update Transportation" : "Add Transportation"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
