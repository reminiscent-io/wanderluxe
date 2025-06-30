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
import { cn } from "@/lib/utils";
import * as PopoverPrimitive from "@radix-ui/react-popover";

export type DateRange = {
  from?: Date | null;
  to?: Date | null;
};

interface Props {
  name: string;
  label: string;
  required?: boolean;
  defaultMonth?: Date;
  /** Pass `control` if not inside a FormProvider */
  control?: RHFControl<any>;
  /** Optional callback when dates change */
  onChange?: (range: DateRange) => void;
}

/** Strip out any timezone offset so we format only the date portion */
const fmtDate = (d?: Date | null) => {
  if (!d) return "";
  // shift by local offset to treat as UTC midnight
  const utcMidnight = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
  return format(utcMidnight, "MMM d, yyyy");
};

export default function DateRangeField({
  name,
  label,
  required,
  defaultMonth,
  control: externalControl,
  onChange,
}: Props) {
  const ctx = useFormContext();
  const control = ctx?.control ?? externalControl;
  if (!control) {
    throw new Error(
      "DateRangeField: no RHF control found. Wrap in <Form> or pass control prop."
    );
  }

  return (
    <Controller
      name={name as any}
      control={control}
      render={({ field }) => {
        const value = (field.value || {}) as DateRange;
        const display =
          value.from && value.to
            ? `${fmtDate(value.from)} – ${fmtDate(value.to)}`
            : value.from
            ? `${fmtDate(value.from)} → Select end date`
            : "Select date range";

        const update = (patch: Partial<DateRange>) => {
          const newValue = { ...value, ...patch };
          field.onChange(newValue);
          onChange?.(newValue);
        };

        return (
          <div className="space-y-1">
            <label className="text-sm font-medium text-sand-700">
              {label} {required && <span className="text-red-500">*</span>}
            </label>

            <Popover>
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

              <PopoverPrimitive.Portal>
                <PopoverPrimitive.Content
                  side="bottom"
                  align="start"
                  sideOffset={6}
                  className="z-[600] w-[340px] rounded-md border bg-white p-0 shadow-md"
                >
                  <Calendar
                    mode="range"
                    numberOfMonths={1}
                    selected={{
                      from: value.from ?? undefined,
                      to: value.to ?? undefined,
                    }}
                    onSelect={(r) => {
                      update({ from: r?.from, to: r?.to });
                      // Auto-close when both dates are selected
                      if (r?.from && r?.to) {
                        // Small delay to allow user to see the selection
                        setTimeout(() => {
                          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
                        }, 300);
                      }
                    }}
                    defaultMonth={defaultMonth}
                    initialFocus
                  />
                </PopoverPrimitive.Content>
              </PopoverPrimitive.Portal>
            </Popover>
          </div>
        );
      }}
    />
  );
}