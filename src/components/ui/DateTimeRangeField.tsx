// src/components/ui/DateTimeRangeField.tsx
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Controller, useFormContext } from "react-hook-form";
import { useEffect, useRef, useState } from "react";
import { DateRange } from "react-day-picker";

import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

import * as PopoverPrimitive from "@radix-ui/react-popover";

interface Props {
  name: string;
  label: string;
  required?: boolean;
  autoFocus?: boolean;
  tripArrivalDate?: string | null;
  tripDepartureDate?: string | null;
}

export default function DateTimeRangeField({ name, label, required, autoFocus, tripArrivalDate, tripDepartureDate }: Props) {
  const { control } = useFormContext();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Auto-focus the trigger button when autoFocus is enabled
  useEffect(() => {
    if (autoFocus && triggerRef.current) {
      triggerRef.current.focus();
    }
  }, [autoFocus]);

  // Calculate default month to show based on trip dates
  const getDefaultMonth = () => {
    if (tripArrivalDate) {
      return new Date(tripArrivalDate);
    }
    return new Date(); // Fallback to current date
  };

  return (
    <Controller
      control={control}
      name={name as any}
      render={({ field }) => {
        const range = field.value as DateRange | undefined;
        
        // Use shorter, cleaner date format
        const display = range?.from && range?.to
          ? `${format(range.from, "MMM d, yyyy")} → ${format(range.to, "MMM d, yyyy")}`
          : range?.from
          ? `${format(range.from, "MMM d, yyyy")} → Select end date`
          : "Select dates";

        return (
          <div className="space-y-1">
            <label className="text-sm font-medium text-sand-700">
              {label} {required && <span className="text-red-500">*</span>}
            </label>

            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <Button
                  ref={triggerRef}
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !range?.from && "text-sand-500",
                  )}
                  onClick={() => setIsOpen(true)}
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
                  className="z-[600] p-0 bg-white rounded-md shadow-md border"
                  onOpenAutoFocus={(e) => {
                    // Prevent the popover from stealing focus from the calendar
                    e.preventDefault();
                  }}
                >
                  <Calendar
                    mode="range"
                    numberOfMonths={1}
                    selected={range}
                    onSelect={(newRange: DateRange | undefined) => {
                      field.onChange(newRange);
                      // Close the popover when both dates are selected
                      if (newRange?.from && newRange?.to) {
                        setIsOpen(false);
                      }
                    }}
                    defaultMonth={getDefaultMonth()}
                    autoFocus={true}
                    className="p-3"
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