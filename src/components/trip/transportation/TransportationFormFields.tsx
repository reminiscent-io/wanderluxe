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
import LuxuryDateTimeRangePicker from "@/components/ui/LuxuryDateTimeRangePicker";
import LocationInputPair from "./LocationInputPair";
import {
  CURRENCIES,
  CURRENCY_SYMBOLS,
} from "@/utils/currencyConstants";
import {
  formatTransportationType,
  getTransportationIcon,
} from "@/utils/transportationUtils";
import TravelersTagMultiSelect from "../travelers/TravelersTagMultiSelect";
import { Switch } from "@/components/ui/switch";

interface Props {
  form: UseFormReturn<any>;
  tripArrivalDate?: string | null;
  tripId: string;
}

const Required = () => <span className="text-red-500">*</span>;

export default function TransportationFormFields({
  form,
  tripArrivalDate,
  tripId,
}: Props) {
  const { control, setValue, getValues } = form;

  // Outbound fields
  const departure = useWatch({ control, name: "departure_location" }) as string;
  const arrival = useWatch({ control, name: "arrival_location" }) as string;

  // Flight + Roundtrip state
  const type = useWatch({ control, name: "type" }) as string;
  const isRoundtrip = useWatch({ control, name: "is_roundtrip" }) as boolean;

  // Return leg fields & guard for user edits
  const returnDeparture = useWatch({ control, name: "return_departure_location" }) as string;
  const returnArrival = useWatch({ control, name: "return_arrival_location" }) as string;
  const [returnTouched, setReturnTouched] = useState(false);

  // Auto-swap locations for return when RT is ON (until the user edits)
  useEffect(() => {
    if (type === "flight" && isRoundtrip && !returnTouched) {
      setValue("return_departure_location", arrival || "");
      setValue("return_arrival_location", departure || "");
    }
  }, [type, isRoundtrip, departure, arrival, returnTouched, setValue]);

  // Cost display
  const cost = useWatch({ control, name: "cost" }) as number | null;
  const [, setCostDisplay] = useState(cost?.toString() ?? "");
  useEffect(() => {
    setCostDisplay(cost?.toString() ?? "");
  }, [cost]);

  return (
    <div className="space-y-4 w-full max-w-full overflow-hidden">
      {/* Transportation Type */}
      <Controller
        control={control}
        name="type"
        render={({ field }) => (
          <div className="space-y-2">
            <Label>
              Transportation Type <Required />
            </Label>
            <Select
              value={field.value}
              onValueChange={(v) => {
                field.onChange(v);
                if (v !== "flight") setValue("is_roundtrip", false);
              }}
            >
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
                {["flight", "train", "car_service", "shuttle", "ferry", "rental_car"].map(
                  (t) => (
                    <SelectItem key={t} value={t}>
                      <div className="flex items-center gap-2">
                        <span>{getTransportationIcon(t)}</span>
                        <span>{formatTransportationType(t)}</span>
                      </div>
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
        )}
      />

      {/* Roundtrip toggle (flights only) */}
      {type === "flight" && (
        <Controller
          control={control}
          name="is_roundtrip"
          render={({ field }) => (
            <div className="flex items-center justify-between rounded-md border border-sand-200 bg-sand-50 p-3">
              <div className="space-y-0.5">
                <Label className="text-sm">Roundtrip</Label>
                <p className="text-xs text-sand-600">
                  Adds a return flight and auto-uses swapped locations.
                </p>
              </div>
              <Switch
                checked={!!field.value}
                onCheckedChange={(checked) => {
                  field.onChange(checked);
                  if (checked) {
                    const a = getValues("arrival_location") || "";
                    const d = getValues("departure_location") || "";
                    setValue("return_departure_location", a);
                    setValue("return_arrival_location", d);
                    setReturnTouched(false);
                  }
                }}
              />
            </div>
          )}
        />
      )}

      {/* Outbound From / To */}
      <LocationInputPair
        fromValue={departure}
        toValue={arrival}
        onFromChange={(v) => setValue("departure_location", v)}
        onToChange={(v) => setValue("arrival_location", v)}
        transportationType={form.getValues("type") as string}
      />

      {/* Outbound Dates */}
      <LuxuryDateTimeRangePicker
        name="travel_range"
        label="Travel Dates"
        required
        defaultMonth={tripArrivalDate ? new Date(tripArrivalDate) : undefined}
        control={control}
      />

      {/* ⬇️ Return Flight now appears right below outbound dates */}
      {type === "flight" && isRoundtrip && (
        <fieldset className="mt-1 rounded-md border border-sand-200 p-3">
          <legend className="px-1 text-xs text-sand-600">Return flight</legend>

          <LocationInputPair
            fromValue={returnDeparture || ""}
            toValue={returnArrival || ""}
            onFromChange={(v) => {
              setValue("return_departure_location", v);
              setReturnTouched(true);
            }}
            onToChange={(v) => {
              setValue("return_arrival_location", v);
              setReturnTouched(true);
            }}
            transportationType="flight"
          />

          <LuxuryDateTimeRangePicker
            name="return_travel_range"
            label="Return Travel Dates"
            required
            defaultMonth={tripArrivalDate ? new Date(tripArrivalDate) : undefined}
            control={control}
          />
        </fieldset>
      )}

      {/* Provider & Confirmation Number */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
      </div>

      {/* Cost & Currency */}
      <div className="space-y-2">
        <Label>Cost & Currency</Label>
        <div className="grid grid-cols-2 gap-3 w-full">
          <Controller
            control={control}
            name="cost"
            render={({ field }) => (
              <div>
                <Input
                  type="text"
                  value={
                    cost !== undefined && cost !== null
                      ? new Intl.NumberFormat("en-US").format(cost)
                      : ""
                  }
                  onChange={(e) => {
                    const numericValue = Number(e.target.value.replace(/,/g, ""));
                    setValue(
                      "cost",
                      Number.isNaN(numericValue) ? null : numericValue
                    );
                  }}
                  placeholder="0"
                  className="bg-white"
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

      {/* Travelers */}
      <Controller
        control={control}
        name="travelers"
        render={({ field }) => (
          <div className="space-y-2">
            <Label>Travelers</Label>
            <TravelersTagMultiSelect
              tripId={tripId}
              value={field.value || []}
              onChange={field.onChange}
            />
          </div>
        )}
      />
    </div>
  );
}
