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
  onSave: (arrivalDate?: string, departureDate?: string) => void;
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

  const handleSave = () => {
    if (range?.from && range?.to) {
      const newArrival = format(range.from, 'yyyy-MM-dd');
      const newDeparture = format(range.to, 'yyyy-MM-dd');
      console.log('TripDateEditDialog saving dates:', { newArrival, newDeparture });
      onArrivalChange(newArrival);
      onDepartureChange(newDeparture);
      onSave(newArrival, newDeparture);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] z-[300]">
        <DialogHeader>
          <DialogTitle>Edit Trip Dates</DialogTitle>
          <DialogDescription>
            Select your trip's arrival and departure dates.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Calendar
            mode="range"
            selected={range}
            onSelect={setRange}
            defaultMonth={range?.from}
            numberOfMonths={1}
            className="rounded-md border shadow mx-auto"
          />
          
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1" disabled={!range?.from || !range?.to}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
