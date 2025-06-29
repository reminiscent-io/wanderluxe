// src/components/ui/DateTimeRangeField.tsx
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Controller, useFormContext } from "react-hook-form";

import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

import * as PopoverPrimitive from "@radix-ui/react-popover"; // ← NEW

interface Props {
  name: string;
  label: string;
  required?: boolean;
}

export default function DateTimeRangeField({ name, label, required }: Props) {
  const { control } = useFormContext();

  return (
    <Controller
      control={control}
      name={name as any}
      render={({ field }) => {
        const range = field.value as { from?: Date; to?: Date };
        const display =
          range?.from && range?.to
            ? `${format(range.from, "PPP")} → ${format(range.to, "PPP")}`
            : "Select dates";

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
                    "w-full justify-start text-left font-normal",
                    !range?.from && "text-sand-500",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {display}
                </Button>
              </PopoverTrigger>

              {/* 🆕 Portal the calendar so it’s outside the dialog */}
              <PopoverPrimitive.Portal>
                <PopoverPrimitive.Content
                  side="bottom"
                  align="start"
                  sideOffset={6}
                  className="z-[600] p-0 bg-white rounded-md shadow-md border"
                >
                  <Calendar
                    mode="range"
                    numberOfMonths={1}
                    selected={range}
                    onSelect={field.onChange}
                    autoFocus
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
