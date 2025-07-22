import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import {
  Controller,
  useFormContext,
  Control as RHFControl,
} from "react-hook-form";

import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import * as PopoverPrimitive from "@radix-ui/react-popover";

export type DateTimeRange = {
  from?: Date | null;
  to?: Date | null;
  fromTime?: string;
  toTime?: string;
};

interface Props {
  name: string;
  label: string;
  required?: boolean;
  defaultMonth?: Date;
  /** Pass `control` if not inside a FormProvider */
  control?: RHFControl<any>;
  /** Hide the time input section */
  hideTimeInputs?: boolean;
}

/* helper: "15:00" → "3:00 pm" */
const prettyTime = (t?: string) => {
  if (!t) return "--:--";
  const [h, m] = t.split(":").map(Number);
  const d = new Date(1970, 0, 1, h, m);
  return format(d, "h:mm aa").toLowerCase();
};

/** Strip out any timezone offset so we format only the date portion */
const fmtDate = (d?: Date | null) => {
  if (!d) return "";
  // shift by local offset to treat as UTC midnight
  const utcMidnight = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
  return format(utcMidnight, "MMM d, yyyy");
};

export default function DateTimeRangeField({
  name,
  label,
  required,
  defaultMonth,
  control: externalControl,
  hideTimeInputs = false,
}: Props) {
  const ctx = useFormContext();
  const control = ctx?.control ?? externalControl;
  if (!control) {
    throw new Error(
      "DateTimeRangeField: no RHF control found. Wrap in <Form> or pass control prop."
    );
  }

  return (
    <Controller
      name={name as any}
      control={control}
      render={({ field }) => {
        const value = (field.value || {}) as DateTimeRange;
        const display = hideTimeInputs
          ? (value.from && value.to
              ? `${fmtDate(value.from)} – ${fmtDate(value.to)}`
              : value.from
              ? `${fmtDate(value.from)} → Select end date`
              : "Select date range")
          : (value.from && value.to
              ? `${fmtDate(value.from)} – ${fmtDate(value.to)} at ${prettyTime(
                  value.fromTime
                )} → ${prettyTime(value.toTime)}`
              : "Select date range");

        const update = (patch: Partial<DateTimeRange>) =>
          field.onChange({ ...value, ...patch });

        return (
          <div className="space-y-1">
            <label className="text-sm font-medium text-sand-700">
              {label} {required && <span className="text-red-500">*</span>}
            </label>

            <Popover modal={true}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-sand-800 border-sand-700 text-sand-900",
                    !value.from && "text-sand-500"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {display}
                </Button>
              </PopoverTrigger>

              <PopoverPrimitive.Portal container={typeof document !== 'undefined' ? document.body : undefined}>
                <PopoverPrimitive.Content
                  side="bottom"
                  align="center"
                  sideOffset={0}
                  avoidCollisions={false}
                  className="fixed inset-0 flex items-center justify-center z-[1000] p-4"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <div className="w-[340px] max-w-[calc(100vw-2rem)] rounded-md border bg-white p-0 shadow-xl animate-in fade-in-0 zoom-in-95">
                    <Calendar
                      mode="range"
                    numberOfMonths={1}
                    selected={{
                      from: value.from ?? undefined,
                      to: value.to ?? undefined,
                    }}
                    onSelect={(r) => update({ from: r?.from, to: r?.to })}
                    defaultMonth={defaultMonth}
                      initialFocus
                    />

                    {!hideTimeInputs && (
                      <div className="flex items-center gap-4 border-t px-3 py-2">
                        <div className="flex flex-col space-y-1">
                          <Label className="text-xs">Start&nbsp;Time</Label>
                          <Input
                            type="time"
                            value={value.fromTime ?? ""}
                            onChange={(e) => update({ fromTime: e.target.value })}
                            className="w-28"
                          />
                        </div>
                        <div className="flex flex-col space-y-1">
                          <Label className="text-xs">End&nbsp;Time</Label>
                          <Input
                            type="time"
                            value={value.toTime ?? ""}
                            onChange={(e) => update({ toTime: e.target.value })}
                            className="w-28"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </PopoverPrimitive.Content>
              </PopoverPrimitive.Portal>
            </Popover>
          </div>
        );
      }}
    />
  );
}
