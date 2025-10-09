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
import { getTransportationTravelerIds, setTransportationTravelers } from "@/services/travelers";

type Transportation = Tables<"transportation">;

interface SaveBulkResult {
  outbound: Transportation;
  returnLeg?: Transportation;
}

interface Props {
  initialData?: Partial<Transportation>;
  /** optional paired leg when editing a roundtrip */
  initialReturnData?: Partial<Transportation>;
  onSubmit: (data: any) => Promise<any> | any;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
  tripArrivalDate?: string | null;
  tripDepartureDate?: string | null;
  buttonClassName?: string;
  tripId: string;
}

export default function TransportationForm({
  initialData,
  initialReturnData,
  onSubmit,
  onCancel,
  onDelete,
  tripArrivalDate,
  tripDepartureDate,
  buttonClassName,
  tripId,
}: Props) {
  /* ------------------------------------------------------------------------ */
  const rtMetaFromDetails = (details?: string | null) => {
    if (!details) return undefined;
    const m = details.match(/\[rt:([a-zA-Z0-9-]+);leg:(outbound|return)\]/);
    if (!m) return undefined;
    return { groupId: m[1], leg: m[2] as "outbound" | "return" };
    // eslint-disable-next-line
  };

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
    travelers: z.array(z.string()).optional(),

    // roundtrip additions
    is_roundtrip: z.boolean().default(false),
    rt_group_id: z.string().optional(),
    return_departure_location: z.string().optional(),
    return_arrival_location: z.string().optional(),
    return_travel_range: z.any().optional(),
  });

  /* ------------------------------------------------------------------------ */
  const defaultIsRoundtrip =
    (initialData?.type === "flight" && !!rtMetaFromDetails(initialData?.details)) ||
    !!initialReturnData;

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
              end: initialData.end_date
                ? parse(initialData.end_date, "yyyy-MM-dd", new Date())
                : parse(initialData.start_date, "yyyy-MM-dd", new Date()),
              startTime: initialData.start_time || "",
              endTime: initialData.end_time || "",
            }
          : undefined,
      provider: initialData?.provider ?? "",
      details: initialData?.details ?? "",
      confirmation_number: initialData?.confirmation_number ?? "",
      cost: initialData?.cost ?? null,
      currency: initialData?.currency ?? CURRENCIES[0],
      travelers: [],

      // roundtrip defaults
      is_roundtrip: defaultIsRoundtrip,
      rt_group_id: rtMetaFromDetails(initialData?.details)?.groupId,
      return_departure_location:
        initialReturnData?.departure_location ??
        (initialData?.arrival_location ?? ""),
      return_arrival_location:
        initialReturnData?.arrival_location ??
        (initialData?.departure_location ?? ""),
      return_travel_range:
        initialReturnData?.start_date
          ? {
              start: parse(initialReturnData.start_date, "yyyy-MM-dd", new Date()),
              end: initialReturnData.end_date
                ? parse(initialReturnData.end_date, "yyyy-MM-dd", new Date())
                : parse(initialReturnData.start_date, "yyyy-MM-dd", new Date()),
              startTime: initialReturnData.start_time || "",
              endTime: initialReturnData.end_time || "",
            }
          : undefined,
    },
  });

  /* ------------------- reset on trip-date change ------------------- */
  useEffect(() => {
    if (!initialData && (tripArrivalDate || tripDepartureDate)) {
      form.setValue("travel_range", {
        start: tripArrivalDate ? parse(tripArrivalDate, "yyyy-MM-dd", new Date()) : null,
        end: tripDepartureDate ? parse(tripArrivalDate, "yyyy-MM-dd", new Date()) : null,
        startTime: "",
        endTime: "",
      });
    }
  }, [tripArrivalDate, tripDepartureDate, initialData, form]);

  /* ------------------ watch the range ------------------ */
  const travelRange = useWatch({ control: form.control, name: "travel_range" }) as LuxuryDateTimeRange;
  const returnRange = useWatch({ control: form.control, name: "return_travel_range" }) as LuxuryDateTimeRange;
  const isRoundtrip = useWatch({ control: form.control, name: "is_roundtrip" }) as boolean;

  // Ensure we have a group id once RT is enabled
  useEffect(() => {
    if (isRoundtrip && !form.getValues("rt_group_id")) {
      const id = (crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
      form.setValue("rt_group_id", id, { shouldDirty: true });
    }
  }, [isRoundtrip, form]);

  /* ------------------- load existing travelers ------------------- */
  useEffect(() => {
    const loadTravelers = async () => {
      if (initialData?.id) {
        try {
          const { data: travelerIds, error } = await getTransportationTravelerIds(tripId, initialData.id);
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

    const outbound: Partial<Transportation> = {
      ...initialData,
      type: data.type as any,
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
    };

    const bulkPayload: any = {
      outbound,
      isRoundtrip: !!data.is_roundtrip,
      rtGroupId: data.rt_group_id,
    };

    if (data.is_roundtrip) {
      if (!returnRange?.start || !returnRange?.end) {
        toast.error("Please select the return flight dates");
        return;
      }
      const returnLeg: Partial<Transportation> = {
        type: 'flight',
        departure_location: data.return_departure_location || data.arrival_location,
        arrival_location: data.return_arrival_location || data.departure_location,
        provider: data.provider,
        details: data.details,
        confirmation_number: data.confirmation_number,
        cost: data.cost,
        currency: data.currency,
        start_date: format(returnRange.start, "yyyy-MM-dd"),
        end_date: format(returnRange.end, "yyyy-MM-dd"),
        start_time: returnRange.startTime || null,
        end_time: returnRange.endTime || null,
      };
      bulkPayload.returnLeg = returnLeg;
    }

    try {
      setSaving(true);
      const result = await onSubmit(data.is_roundtrip ? bulkPayload : outbound);

      // Save traveler assignments for both legs if needed
      const travelerIds = data.travelers || [];
      if (travelerIds.length > 0) {
        if (data.is_roundtrip && (result as SaveBulkResult)?.outbound?.id) {
          const r = result as SaveBulkResult;
          const outboundId = r.outbound.id;
          await setTransportationTravelers(tripId, outboundId, travelerIds);
          if (r.returnLeg?.id) {
            await setTransportationTravelers(tripId, r.returnLeg.id, travelerIds);
          }
        } else if ((result as Transportation)?.id) {
          await setTransportationTravelers(tripId, (result as Transportation).id, travelerIds);
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
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 w-full max-w-full">
        <TransportationFormFields
          form={form}
          tripArrivalDate={tripArrivalDate}
          tripId={tripId}
        />

        <div className="flex items-center justify-between pt-4">
          {initialData && onDelete && (
            <Button
              type="button"
              variant="ghost"
              onClick={onDelete}
              disabled={saving}
              className="text-red-600 hover:bg-red-50 hover:text-red-700 w-8 h-8 p-0"
            >
              <Trash2 className="h-4 w-4" />
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
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : initialData ? (
                "Save"
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
