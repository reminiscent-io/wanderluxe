import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  onSave: () => void;
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

  // seed when opening
  useEffect(() => {
    console.log('TripDateEditDialog - isOpen:', isOpen, 'arrivalDate:', arrivalDate, 'departureDate:', departureDate);
    if (isOpen) {
      setRange({
        from: arrivalDate ? parseLocalDate(arrivalDate) : undefined,
        to:   departureDate ? parseLocalDate(departureDate) : undefined,
      });
      console.log('TripDateEditDialog - set range:', {
        from: arrivalDate ? parseLocalDate(arrivalDate) : undefined,
        to:   departureDate ? parseLocalDate(departureDate) : undefined,
      });
    }
  }, [isOpen, arrivalDate, departureDate]);

  // commit on Save
  const handleSave = () => {
    if (range.from) {
      onArrivalChange(format(range.from, 'yyyy-MM-dd'));
    }
    if (range.to) {
      onDepartureChange(format(range.to, 'yyyy-MM-dd'));
    }
    onSave();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] z-[300]">
        <DialogHeader>
          <DialogTitle>Edit Trip Dates</DialogTitle>
        </DialogHeader>

        <Calendar
          mode="range"
          selected={range.from && range.to ? range : undefined}
          onSelect={setRange}
          defaultMonth={range.from}
          numberOfMonths={1}
        />

        <div className="pt-4">
          <Button onClick={handleSave} className="w-full">
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
