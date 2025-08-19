import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Controller, useFormContext, Control as RHFControl } from "react-hook-form";

import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

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
  control?: RHFControl<any>;
  hideTimeInputs?: boolean;
  /** 15 or 30 minute steps */
  minuteStep?: 15 | 30;
}

/* helper: "15:00" → "3:00 pm" */
const prettyTime = (t?: string) => {
  if (!t) return "--:--";
  const [h, m] = t.split(":").map(Number);
  const d = new Date(1970, 0, 1, h, m);
  return format(d, "h:mm aa").toLowerCase();
};

/** format date only (no TZ confusion) */
const fmtDate = (d?: Date | null) => (d ? format(d, "MMM d, yyyy") : "");

const timeOptions = (step: 15 | 30 = 30) => {
  const out: { value: string; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += step) {
      const v = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      out.push({ value: v, label: prettyTime(v) });
    }
  }
  return out;
};

export default function DateTimeRangeField({
  name,
  label,
  required,
  defaultMonth,
  control: externalControl,
  hideTimeInputs = false,
  minuteStep = 30,
}: Props) {
  const ctx = useFormContext();
  const control = ctx?.control ?? externalControl;
  if (!control) throw new Error("DateTimeRangeField: no RHF control found.");

  // when inside a Radix Dialog, portal into its content to avoid z fights
  const dialogContainer =
    typeof document !== "undefined"
      ? (document.querySelector("[data-radix-dialog-content]") as HTMLElement | null) ??
        (document.querySelector('[role="dialog"]') as HTMLElement | null)
      : null;

  const times = React.useMemo(() => timeOptions(minuteStep), [minuteStep]);

  return (
    <Controller
      name={name as any}
      control={control}
      render={({ field }) => {
        const value = (field.value || {}) as DateTimeRange;

        const dateDisplay =
          value.from && value.to
            ? `${fmtDate(value.from)} – ${fmtDate(value.to)}`
            : value.from
            ? `${fmtDate(value.from)} → Select end date`
            : "Select date range";

        const timeDisplay =
          !hideTimeInputs && value.fromTime && value.toTime
            ? `${prettyTime(value.fromTime)} → ${prettyTime(value.toTime)}`
            : null;

        const update = (patch: Partial<DateTimeRange>) => field.onChange({ ...value, ...patch });

        return (
          <div className="space-y-1">
            <label className="text-sm font-medium text-sand-700">
              {label} {required && <span className="text-red-500">*</span>}
            </label>

            <Popover modal={false}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-sand-50 border-sand-200 text-sand-900 h-auto py-2 px-3",
                    !value.from && "text-sand-500"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div className="flex flex-col items-start text-left min-w-0 flex-1">
                    <span className="truncate w-full">{dateDisplay}</span>
                    {timeDisplay && (
                      <span className="text-xs text-sand-600 truncate w-full mt-0.5">
                        {timeDisplay}
                      </span>
                    )}
                  </div>
                </Button>
              </PopoverTrigger>

              <PopoverContent
                // if we're in a dialog, mount here to share stacking context
                // @ts-expect-error shadcn PopoverContent forwards to Radix Portal
                container={dialogContainer ?? undefined}
                align="start"
                sideOffset={8}
                className="z-[700] w-[340px] p-0 bg-white"
              >
                <Calendar
                  mode="range"
                  numberOfMonths={1}
                  selected={{ from: value.from ?? undefined, to: value.to ?? undefined }}
                  onSelect={(r) => update({ from: r?.from ?? null, to: r?.to ?? null })}
                  defaultMonth={defaultMonth}
                  initialFocus
                />

                {!hideTimeInputs && (
                  <div className="border-t px-3 py-2 space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Start time</Label>
                        <Select
                          value={value.fromTime ?? ""}
                          onValueChange={(v) => update({ fromTime: v })}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="--:--" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[240px]">
                            {times.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">End time</Label>
                        <Select
                          value={value.toTime ?? ""}
                          onValueChange={(v) => update({ toTime: v })}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="--:--" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[240px]">
                            {times.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 px-2 text-xs"
                        onClick={() => update({ from: null, to: null, fromTime: "", toTime: "" })}
                      >
                        Clear
                      </Button>
                      <Button type="button" size="sm" onClick={() => (document.activeElement as HTMLElement)?.blur()}>
                        Apply
                      </Button>
                    </div>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        );
      }}
    />
  );
}
