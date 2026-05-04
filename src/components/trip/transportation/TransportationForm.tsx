import React, { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import { format, parse } from "date-fns";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import TransportationFormFields from "./TransportationFormFields";
import { LuxuryDateTimeRange } from "@/components/ui/LuxuryDateTimeRangePicker";
import { CURRENCIES } from "@/utils/currencyConstants";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";
import TravelersTagMultiSelect from "../travelers/TravelersTagMultiSelect";
import { getJunctionTravelerIds, setJunctionTravelers } from "@/services/travelers";

type Transportation = Tables<"transportation">;

interface Props {
  initialData?: Partial<Transportation>;
  onSubmit: (data: Partial<Transportation>) => Promise<unknown> | unknown;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
  tripArrivalDate?: string | null;
  tripDepartureDate?: string | null;
  buttonClassName?: string;
  tripId: string;
}

export default function TransportationForm({
  initialData,
  onSubmit,
  onCancel,
  onDelete,
  tripArrivalDate,
  tripDepartureDate,
  buttonClassName,
  tripId,
}: Props) {
  /* ------------------------------------------------------------------------ */
  const schema = z.object({
    type: z.string().min(1),
    departure_location: z.string().min(1),
    arrival_location: z.string().min(1),
    travel_range: z.any().optional(),
    provider: z.string().optional(),
    details: z.string().optional(),
    confirmation_number: z.string().optional(),
    flight_number: z.string().optional(),
    scheduled_start_time: z.string().nullable().optional(),
    scheduled_end_time: z.string().nullable().optional(),
    cost: z.number().nullable(),
    currency: z.string().min(1),
    travelers: z.array(z.string()).optional(),
  });

  /* ------------------------------------------------------------------------ */
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: initialData?.type ?? "flight",
      departure_location: initialData?.departure_location ?? "",
      arrival_location: initialData?.arrival_location ?? "",
      travel_range:
        initialData?.start_date
          ? {
              start: parse(initialData.start_date, "yyyy-MM-dd", new Date()),
              end: initialData.end_date ? parse(initialData.end_date, "yyyy-MM-dd", new Date()) : parse(initialData.start_date, "yyyy-MM-dd", new Date()),
              startTime: initialData.start_time || "",
              endTime: initialData.end_time || "",
            }
          : undefined,
      provider: initialData?.provider ?? "",
      details: initialData?.details ?? "",
      confirmation_number: initialData?.confirmation_number ?? "",
      flight_number: initialData?.flight_number ?? "",
      scheduled_start_time: initialData?.scheduled_start_time ?? null,
      scheduled_end_time: initialData?.scheduled_end_time ?? null,
      cost: initialData?.cost ?? null,
      currency: initialData?.currency ?? CURRENCIES[0],
      travelers: [],
    },
  });



  /* ------------------- reset on trip-date change ------------------- */
  useEffect(() => {
    // Only use trip dates for completely new forms (no initialData at all)
    // Don't override existing transportation data with trip dates
    if (!initialData && (tripArrivalDate || tripDepartureDate)) {
      const current = form.getValues();
      
      form.setValue("travel_range", {
        start: tripArrivalDate ? parse(tripArrivalDate, "yyyy-MM-dd", new Date()) : null,
        end: tripDepartureDate ? parse(tripArrivalDate, "yyyy-MM-dd", new Date()) : null,
        startTime: "",
        endTime: "",
      });
    }
  }, [tripArrivalDate, tripDepartureDate, initialData, form]);

  /* ------------------ watch the range ------------------ */
  const travelRange = useWatch({
    control: form.control,
    name: "travel_range",
  }) as LuxuryDateTimeRange;

  /* ------------------- load existing travelers ------------------- */
  useEffect(() => {
    const loadTravelers = async () => {
      if (initialData?.id) {
        try {
          const { data: travelerIds, error } = await getJunctionTravelerIds("transportation", tripId, initialData.id);
          if (!error && travelerIds) {
            form.setValue("travelers", travelerIds);
          }
        } catch (error) {
          console.error("Error loading transportation travelers:", error);
        }
      }
    };
    
    loadTravelers();
  }, [initialData?.id, tripId, form]);

  /* ------------------- submit handler ------------------- */
  const [saving, setSaving] = useState(false);
  const handleSubmit = async (data: z.infer<typeof schema>) => {
    if (!travelRange?.start || !travelRange?.end) {
      toast.error("Please select departure and arrival dates");
      return;
    }

    const payload: Partial<Transportation> = {
      ...initialData,
      type: data.type as Transportation['type'],
      departure_location: data.departure_location,
      arrival_location: data.arrival_location,
      provider: data.provider,
      details: data.details,
      confirmation_number: data.confirmation_number,
      cost: data.cost,
      currency: data.currency,
      start_date: format(travelRange.start, "yyyy-MM-dd"),
      end_date: format(travelRange.end, "yyyy-MM-dd"),
      start_time: travelRange.startTime || null,
      end_time: travelRange.endTime || null,
      ...(data.type === "flight" && {
        flight_number: data.flight_number?.trim().toUpperCase() || null,
        scheduled_start_time: data.scheduled_start_time || null,
        scheduled_end_time: data.scheduled_end_time || null,
      }),
    } as Partial<Transportation>;

    try {
      setSaving(true);
      const result = await onSubmit(payload);
      
      // Save traveler assignments after successful transportation save
      if (data.travelers && data.travelers.length > 0) {
        const transportationId = initialData?.id || (result as { id?: string } | null | undefined)?.id;
        if (transportationId) {
          await setJunctionTravelers("transportation", tripId, transportationId, data.travelers);
        }
      }
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
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 w-full max-w-full">
        <TransportationFormFields
          form={form}
          tripArrivalDate={tripArrivalDate}
          tripId={tripId}
        />

        <div className="sticky bottom-0 z-10 bg-background flex items-center justify-between pt-4 -mt-px border-t border-sand-200">
          <div>
            {initialData && onDelete && (
              <Button
                type="button"
                variant="ghost"
                onClick={onDelete}
                disabled={saving}
                className="text-red-500 hover:text-red-600 hover:bg-red-50 w-9 h-9 p-0 border border-red-200 rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
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
