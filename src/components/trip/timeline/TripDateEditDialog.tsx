import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";

interface TripDateEditDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  arrivalDate: string;
  departureDate: string;
  onArrivalChange: (date: string) => void;
  onDepartureChange: (date: string) => void;
  onSave: (arrivalDate?: string, departureDate?: string) => void | Promise<void>;
}

// parse "YYYY-MM-DD" as local date (no TZ offset)
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export default function TripDateEditDialog({
  isOpen,
  onOpenChange,
  arrivalDate,
  departureDate,
  onArrivalChange,
  onDepartureChange,
  onSave,
}: TripDateEditDialogProps) {
  const [range, setRange] = useState<DateRange | undefined>();

  // Initialize when opening
  useEffect(() => {
    if (isOpen && arrivalDate && departureDate) {
      const newRange = {
        from: parseLocalDate(arrivalDate),
        to: parseLocalDate(departureDate),
      };
      setRange(newRange);
    }
  }, [isOpen, arrivalDate, departureDate]);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (range?.from && range?.to) {
      const newArrival = format(range.from, 'yyyy-MM-dd');
      const newDeparture = format(range.to, 'yyyy-MM-dd');
      console.log('TripDateEditDialog saving dates:', { newArrival, newDeparture });
      onArrivalChange(newArrival);
      onDepartureChange(newDeparture);
      setIsSaving(true);
      try {
        await onSave(newArrival, newDeparture);
      } finally {
        setIsSaving(false);
      }
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[340px] z-[300]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Edit Trip Dates</DialogTitle>
          <DialogDescription>
            Select your trip's arrival and departure dates.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col space-y-4 overflow-y-auto flex-1">
          <Calendar
            mode="range"
            selected={range}
            onSelect={setRange}
            defaultMonth={range?.from}
            numberOfMonths={1}
            className="rounded-md border shadow-warm-sm mx-auto bg-card"
            classNames={{
              months: "flex flex-col space-y-4",
              month: "space-y-4",
              caption: "flex justify-center pt-1 relative items-center",
              caption_label: "text-sm font-medium",
              nav: "space-x-1 flex items-center",
              nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse space-y-1",
              head_row: "flex",
              head_cell: "text-sand-500 rounded-md w-9 font-normal text-[0.8rem]",
              row: "flex w-full mt-2",
              cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-earth-100 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
              day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
              day_selected: "bg-earth-500 text-white hover:bg-earth-600 hover:text-white focus:bg-earth-600 focus:text-white",
              day_today: "bg-earth-100 text-earth-900",
              day_outside: "text-sand-400 opacity-50",
              day_disabled: "text-sand-400 opacity-50",
              day_range_middle: "aria-selected:bg-earth-100 aria-selected:text-earth-900",
              day_hidden: "invisible",
            }}
          />
          
          <div className="flex gap-2 pt-4 flex-shrink-0">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1"
              disabled={!range?.from || !range?.to || isSaving}
            >
              {isSaving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
