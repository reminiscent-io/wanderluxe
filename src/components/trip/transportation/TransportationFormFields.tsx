// src/components/trip/transportation/TransportationFormFields.tsx
import React, { useEffect, useState } from "react";
import { UseFormReturn, Controller, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import DateTimeRangeField, { DateTimeRange } from "@/components/ui/DateTimeRangeField";
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

interface Props {
  form: UseFormReturn<any>;
  tripArrivalDate?: string | null;
}

const Required = () => <span className="text-red-500">*</span>;

export default function TransportationFormFields({ form, tripArrivalDate }: Props) {
  const { control, setValue } = form;

  // watch departure & arrival so UI updates properly
  const departure = useWatch({
    control,
    name: "departure_location",
  }) as string;
  const arrival = useWatch({
    control,
    name: "arrival_location",
  }) as string;

  // watch cost for formatted display
  const cost = useWatch({ control, name: "cost" }) as number | null;
  const [costDisplay, setCostDisplay] = useState(cost?.toString() ?? "");
  useEffect(() => {
    setCostDisplay(cost?.toString() ?? "");
  }, [cost]);

  return (
    <div className="space-y-4">
      {/* Transportation Type */}
      <Controller
        control={control}
        name="type"
        render={({ field }) => (
          <div className="space-y-2">
            <Label>
              Transportation Type <Required />
            </Label>
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select type">
                  {field.value && (
                    <div className="flex items-center gap-2">
                      <span>{getTransportationIcon(field.value)}</span>
                      <span>{formatTransportationType(field.value)}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="z-[300] bg-sand-50">
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

      {/* Departure / Arrival Locations */}
      <LocationInputPair
        fromValue={departure}
        toValue={arrival}
        onFromChange={(v) => setValue("departure_location", v)}
        onToChange={(v) => setValue("arrival_location", v)}
        transportationType={form.getValues("type") as string}
      />

      {/* Unified Date + Time Picker */}
      <DateTimeRangeField
        name="travel_range"
        label="Travel Dates"
        required
        defaultMonth={tripArrivalDate ? new Date(tripArrivalDate) : undefined}
        control={control}
      />

      {/* Provider */}
      <Controller
        control={control}
        name="provider"
        render={({ field }) => (
          <div className="space-y-2">
            <Label>Provider</Label>
            <Input {...field} placeholder="Airline, train company…" />
          </div>
        )}
      />

      {/* Confirmation Number */}
      <Controller
        control={control}
        name="confirmation_number"
        render={({ field }) => (
          <div className="space-y-2">
            <Label>Confirmation Number</Label>
            <Input {...field} placeholder="Booking reference" />
          </div>
        )}
      />

      {/* Cost & Currency */}
      <div className="space-y-2">
        <Label>Cost & Currency</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Controller
            control={control}
            name="cost"
            render={({ field }) => (
              <div>
                <Input
                  value={costDisplay}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^\d.-]/g, "");
                    setCostDisplay(raw);
                    field.onChange(raw ? parseFloat(raw) : null);
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
              <div>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent className="z-[300] bg-sand-50 max-h-48 overflow-y-auto">
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        <span className="font-medium">{c}</span>
                        <span className="ml-1 text-sand-600 text-sm">
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
          <div className="space-y-2">
            <Label>Details</Label>
            <Textarea {...field} rows={1} placeholder="Additional details" />
          </div>
        )}
      />
    </div>
  );
}
