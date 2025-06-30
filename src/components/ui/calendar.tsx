import * as React from "react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";
import "react-day-picker/dist/style.css";

export function Calendar({
  className,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col space-y-4",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "flex items-center space-x-1",
        nav_button:
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 outline-none",
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "w-9 rounded-md text-[0.8rem] font-normal text-muted-foreground",
        row: "flex w-full mt-2",
        cell:
          "relative h-9 w-9 p-0 text-center text-sm "
          + "[&:has([aria-selected].day-range-start)]:rounded-l-md "
          + "[&:has([aria-selected].day-range-end)]:rounded-r-md",
        day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",

        // ANY selected day (covers single and range start/end)
        day_selected: "bg-sand-500 text-sand-50",
        // Range-specific
        day_range_start: "rounded-l-md bg-sand-500 text-sand-50",
        day_range_middle: "bg-sand-200 text-sand-700",
        day_range_end: "rounded-r-md bg-sand-500 text-sand-50",

        day_today: "border border-sand-400",
        day_outside: "text-muted-foreground opacity-50",
      }}
      {...props}
    />
  );
}
