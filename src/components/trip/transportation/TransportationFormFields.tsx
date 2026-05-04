// src/components/trip/transportation/TransportationFormFields.tsx
import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { UseFormReturn, Controller, useWatch } from "react-hook-form";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import LuxuryDateTimeRangePicker, { LuxuryDateTimeRange } from "@/components/ui/LuxuryDateTimeRangePicker";
import LocationInputPair from "./LocationInputPair";
import {
  CURRENCIES,
  CURRENCY_NAMES,
  CURRENCY_SYMBOLS,
} from "@/utils/currencyConstants";
import {
  formatTransportationType,
  getTransportationIcon
} from "@/utils/transportationUtils";
import TravelersTagMultiSelect from "../travelers/TravelersTagMultiSelect";
import FlightLookupConfirmDialog from "./FlightLookupConfirmDialog";
import {
  lookupFlightStatus,
  FlightNotFoundError,
  RateLimitError,
  UpstreamError,
  type FlightStatusResponse,
} from "@/services/flightStatus";

interface Props {
  // Generic form so this component can be reused; specific schema lives in TransportationForm.
  form: UseFormReturn<Record<string, unknown>>;
  tripArrivalDate?: string | null;
  tripId: string;
}

const Required = () => <span className="text-red-500">*</span>;

export default function TransportationFormFields({ form, tripArrivalDate, tripId }: Props) {
  const { control, setValue, getValues } = form;

  // watch departure & arrival so UI updates properly
  const departure = useWatch({
    control,
    name: "departure_location",
  }) as string;
  const arrival = useWatch({
    control,
    name: "arrival_location",
  }) as string;

  const transportationType = useWatch({ control, name: "type" }) as string;
  const flightNumber = (useWatch({ control, name: "flight_number" }) as string | undefined) ?? "";
  const travelRange = useWatch({ control, name: "travel_range" }) as
    | { start?: Date | null; end?: Date | null; startTime?: string; endTime?: string }
    | undefined;
  const scheduledStartTime = useWatch({ control, name: "scheduled_start_time" }) as string | null | undefined;
  const scheduledEndTime = useWatch({ control, name: "scheduled_end_time" }) as string | null | undefined;

  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<FlightStatusResponse | null>(null);
  const [lookupDate, setLookupDate] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  // watch cost for formatted display
  const cost = useWatch({ control, name: "cost" }) as number | null;
  const [costDisplay, setCostDisplay] = useState(cost?.toString() ?? "");
  useEffect(() => {
    setCostDisplay(cost?.toString() ?? "");
  }, [cost]);

  const canLookup = Boolean(flightNumber?.trim()) && Boolean(travelRange?.start);

  const handleLookupFlight = async () => {
    const trimmed = flightNumber.trim().toUpperCase();
    if (!trimmed || !travelRange?.start) return;

    const date = format(travelRange.start, "yyyy-MM-dd");
    setLookupLoading(true);
    try {
      const result = await lookupFlightStatus(trimmed, date);
      setLookupResult(result);
      setLookupDate(date);
      setConfirmOpen(true);
    } catch (err) {
      if (err instanceof FlightNotFoundError) {
        toast.error("Flight not found, please check the number and date.");
      } else if (err instanceof RateLimitError) {
        toast.error("Flight lookup is rate limited. Please try again in a minute.");
      } else if (err instanceof UpstreamError) {
        toast.error(err.message);
      } else {
        toast.error("Could not look up flight. Please try again.");
      }
    } finally {
      setLookupLoading(false);
    }
  };

  const handleApplyLookup = () => {
    if (!lookupResult) return;
    const result = lookupResult;
    const current = getValues();

    // Only fill fields the user hasn't already populated
    if (!current.provider && result.airline) {
      setValue("provider", result.airline, { shouldDirty: true });
    }
    const depLocation = result.departure.airport_iata
      ? `${result.departure.airport_name || result.departure.airport_iata} (${result.departure.airport_iata})`
      : result.departure.airport_name;
    const arrLocation = result.arrival.airport_iata
      ? `${result.arrival.airport_name || result.arrival.airport_iata} (${result.arrival.airport_iata})`
      : result.arrival.airport_name;
    if (!current.departure_location && depLocation) {
      setValue("departure_location", depLocation, { shouldDirty: true, shouldValidate: true });
    }
    if (!current.arrival_location && arrLocation) {
      setValue("arrival_location", arrLocation, { shouldDirty: true, shouldValidate: true });
    }

    const depLatestTime = result.departure.revised_time_local ?? result.departure.scheduled_time_local;
    const arrLatestTime = result.arrival.revised_time_local ?? result.arrival.scheduled_time_local;
    const arrivalDateStr = result.arrival.revised_date_local ?? result.arrival.scheduled_date_local;
    const arrivalDate = arrivalDateStr ? new Date(`${arrivalDateStr}T00:00:00`) : current.travel_range?.end;

    setValue(
      "travel_range",
      {
        ...(current.travel_range || {}),
        start: current.travel_range?.start ?? new Date(`${result.departure.scheduled_date_local}T00:00:00`),
        end: arrivalDate,
        startTime: depLatestTime,
        endTime: arrLatestTime,
      },
      { shouldDirty: true, shouldValidate: true },
    );

    setValue("scheduled_start_time", result.departure.scheduled_time_local, { shouldDirty: true });
    setValue("scheduled_end_time", result.arrival.scheduled_time_local, { shouldDirty: true });

    // Normalize flight number to uppercase in the form
    setValue("flight_number", result.flight_iata, { shouldDirty: true });

    setConfirmOpen(false);
    toast.success("Flight details applied");
  };

  const isFlight = transportationType === "flight";
  const currentStartTime = travelRange?.startTime ?? "";
  const currentEndTime = travelRange?.endTime ?? "";
  const showOriginalStart = isFlight && scheduledStartTime && scheduledStartTime !== currentStartTime;
  const showOriginalEnd = isFlight && scheduledEndTime && scheduledEndTime !== currentEndTime;

  return (
    <div className="space-y-4 w-full max-w-full overflow-hidden">
      {/* Transportation Type */}
      <Controller
        control={control}
        name="type"
        render={({ field }) => (
          <div className="space-y-1">
            <Label>
              Transportation Type <Required />
            </Label>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select type">
                  {field.value && (
                    <div className="flex items-center gap-2">
                      <span>{getTransportationIcon(field.value)}</span>
                      <span>{formatTransportationType(field.value)}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="z-[300]">
                {[
                  "flight",
                  "train",
                  "car_service",
                  "shuttle",
                  "ferry",
                  "rental_car",
                ].map((t) => (
                  <SelectItem key={t} value={t}>
                    <div className="flex items-center gap-2">
                      <span>{getTransportationIcon(t)}</span>
                      <span>{formatTransportationType(t)}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      />

      {/* Flight Number + Lookup (flight type only) */}
      {isFlight && (
        <Controller
          control={control}
          name="flight_number"
          render={({ field }) => (
            <div className="space-y-1">
              <Label>Flight Number</Label>
              <div className="flex gap-2">
                <Input
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  placeholder="e.g. DL2733"
                  className="flex-1"
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLookupFlight}
                  disabled={!canLookup || lookupLoading}
                  className="shrink-0"
                >
                  {lookupLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Looking up…
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Look up flight
                    </>
                  )}
                </Button>
              </div>
              {!canLookup && flightNumber?.trim() && !travelRange?.start && (
                <p className="text-xs text-muted-foreground">Pick a departure date to enable lookup.</p>
              )}
            </div>
          )}
        />
      )}

      {/* Departure / Arrival Locations */}
      <LocationInputPair
        fromValue={departure}
        toValue={arrival}
        onFromChange={(v) => setValue("departure_location", v)}
        onToChange={(v) => setValue("arrival_location", v)}
        transportationType={form.getValues("type") as string}
      />

      {/* Unified Date + Time Picker */}
      <LuxuryDateTimeRangePicker
        name="travel_range"
        label="Travel Dates"
        required
        defaultMonth={tripArrivalDate ? new Date(tripArrivalDate) : undefined}
        control={control}
        timeStep={60} // 1-minute increments for precise flight/train times
      />
      {(showOriginalStart || showOriginalEnd) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground -mt-2">
          {showOriginalStart && (
            <span>Originally scheduled departure: {scheduledStartTime}</span>
          )}
          {showOriginalEnd && (
            <span>Originally scheduled arrival: {scheduledEndTime}</span>
          )}
        </div>
      )}

      {/* Provider & Confirmation Number */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Controller
          control={control}
          name="provider"
          render={({ field }) => (
            <div className="space-y-1">
              <Label>Provider</Label>
              <Input {...field} placeholder="Airline, train company…" />
            </div>
          )}
        />
        <Controller
          control={control}
          name="confirmation_number"
          render={({ field }) => (
            <div className="space-y-1">
              <Label>Confirmation Number</Label>
              <Input {...field} placeholder="Booking reference" />
            </div>
          )}
        />
      </div>

      {/* Cost & Currency */}
      <div className="space-y-2">
        <Label>Cost</Label>
        <div className="flex gap-3">
          <Controller
            control={control}
            name="cost"
            render={({ field }) => (
              <div className="flex-1">
                <Input
                  type="text"
                  value={cost !== undefined && cost !== null ? new Intl.NumberFormat('en-US').format(cost) : ''}
                  onChange={(e) => {
                    const numericValue = Number(e.target.value.replace(/,/g, ''));
                    setValue("cost", Number.isNaN(numericValue) ? null : numericValue);
                  }}
                  onBlur={(e) => {
                    // The field value is already set by onChange, this ensures visual formatting
                  }}
                  placeholder="0"
                />
              </div>
            )}
          />
          <Controller
            control={control}
            name="currency"
            render={({ field }) => (
              <div className="w-[110px] shrink-0">
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="USD" />
                  </SelectTrigger>
                  <SelectContent className="z-[300] max-h-48 overflow-y-auto">
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        <span className="font-medium">{c}</span>
                        <span className="ml-1 text-muted-foreground text-sm">
                          {CURRENCY_SYMBOLS[c]}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          />
        </div>
      </div>

      {/* Additional Details */}
      <Controller
        control={control}
        name="details"
        render={({ field }) => (
          <div className="space-y-1">
            <Label>Details</Label>
            <Textarea {...field} rows={1} placeholder="Additional details" />
          </div>
        )}
      />

      {/* Travelers */}
      <Controller
        control={control}
        name="travelers"
        render={({ field }) => (
          <div className="space-y-1">
            <Label>Travelers</Label>
            <TravelersTagMultiSelect
              tripId={tripId}
              value={field.value || []}
              onChange={field.onChange}
            />
          </div>
        )}
      />

      <FlightLookupConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        result={lookupResult}
        requestedDate={lookupDate}
        onApply={handleApplyLookup}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
