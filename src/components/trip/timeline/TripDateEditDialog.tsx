import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";

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
  const [range, setRange] = useState<{ from?: Date; to?: Date }>({});

  // seed when opening
  useEffect(() => {
    if (isOpen) {
      setRange({
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Trip Dates</DialogTitle>
        </DialogHeader>

        <Calendar
          mode="range"
          selected={range}
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
