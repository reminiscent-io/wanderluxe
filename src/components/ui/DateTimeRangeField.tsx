import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import {
  Controller,
  useFormContext,
  Control as RHFControl,
} from "react-hook-form";

import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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

        // Local popover state so interaction in Dialog doesn't auto-close it
        const [open, setOpen] = React.useState(false);

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

        const update = (patch: Partial<DateTimeRange>) =>
          field.onChange({ ...value, ...patch });

        const clear = () => {
          field.onChange({ from: null, to: null, fromTime: "", toTime: "" });
          setOpen(false);
        };

        const applyAndClose = () => setOpen(false);

        return (
          <div className="space-y-1">
            <label className="text-sm font-medium text-sand-700">
              {label} {required && <span className="text-red-500">*</span>}
            </label>

            <Popover open={open} onOpenChange={setOpen} modal={true}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full max-w-full justify-start text-left font-normal bg-white border-sand-300 text-sand-900 h-auto py-2 px-3",
                    !value.from && "text-sand-500"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                  <div className="flex flex-col items-start text-left min-w-0 flex-1">
                    <span className="truncate w-full text-sm">{dateDisplay}</span>
                    {timeDisplay && (
                      <span className="text-xs text-sand-600 truncate w-full mt-0.5">
                        {timeDisplay}
                      </span>
                    )}
                  </div>
                </Button>
              </PopoverTrigger>

              {open && (
                <>
                  {/* Backdrop overlay */}
                  <div 
                    className="fixed inset-0 bg-black/20 z-[9998]" 
                    onClick={() => setOpen(false)}
                  />
                  
                  {/* Center the popover on screen with modal behavior */}
                  <PopoverContent
                    align="center"
                    side="top" 
                    sideOffset={0}
                    className="z-[9999] w-[340px] max-w-[calc(100vw-2rem)] p-0 rounded-lg border bg-white shadow-2xl fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"
                    style={{
                      position: 'fixed',
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                      zIndex: 9999,
                    }}
                    onEscapeKeyDown={(e) => {
                      e.stopPropagation();
                      setOpen(false);
                    }}
                    onPointerDownOutside={(e) => {
                      // Allow clicking on time dropdowns without closing
                      // @ts-ignore
                      if (e?.target && (e.target as HTMLElement).closest?.("[data-keep-open]")) {
                        e.preventDefault();
                        return;
                      }
                    }}
                  >
                <div className="p-3">
                  <Calendar
                    mode="range"
                    numberOfMonths={1}
                    captionLayout="dropdown"
                    selected={{
                      from: value.from ?? undefined,
                      to: value.to ?? undefined,
                    }}
                    onSelect={(r) => {
                      console.log('Calendar selected:', r);
                      update({ from: r?.from ?? null, to: r?.to ?? null });
                    }}
                    defaultMonth={value.from ?? defaultMonth}
                    className="rounded-md border-0"
                  />
                </div>

                {!hideTimeInputs && (
                  <div className="flex items-end gap-2 border-t px-3 py-2">
                    <div className="flex-1 flex flex-col space-y-1">
                      <Label className="text-xs font-medium">Start Time</Label>
                      <Input
                        type="time"
                        value={value.fromTime ?? ""}
                        onChange={(e) => update({ fromTime: e.target.value })}
                        className="w-full h-8 text-sm"
                        data-keep-open
                      />
                    </div>
                    <div className="flex-1 flex flex-col space-y-1">
                      <Label className="text-xs font-medium">End Time</Label>
                      <Input
                        type="time"
                        value={value.toTime ?? ""}
                        onChange={(e) => update({ toTime: e.target.value })}
                        className="w-full h-8 text-sm"
                        data-keep-open
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between border-t px-3 py-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="px-2 h-7 text-xs"
                    onClick={clear}
                  >
                    Clear
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs px-3"
                      onClick={() => setOpen(false)}
                    >
                      Close
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="bg-earth-500 text-white hover:bg-earth-600 h-7 text-xs px-3"
                      onClick={applyAndClose}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
                  </PopoverContent>
                </>
              )}
            </Popover>
          </div>
        );
      }}
    />
  );
}
