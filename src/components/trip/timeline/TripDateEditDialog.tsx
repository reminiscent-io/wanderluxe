import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import LuxuryDateTimeRangePicker from '@/components/ui/LuxuryDateTimeRangePicker';

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
  const [dateRange, setDateRange] = useState<{
    startDate: Date | null;
    endDate: Date | null;
    startTime: string;
    endTime: string;
  }>({
    startDate: null,
    endDate: null,
    startTime: '09:00',
    endTime: '17:00',
  });

  // Initialize date range when dialog opens
  useEffect(() => {
    if (isOpen && arrivalDate && departureDate) {
      setDateRange({
        startDate: parseLocalDate(arrivalDate),
        endDate: parseLocalDate(departureDate),
        startTime: '09:00',
        endTime: '17:00',
      });
    }
  }, [isOpen, arrivalDate, departureDate]);

  const handleDateRangeChange = (newDateRange: {
    startDate: Date | null;
    endDate: Date | null;
    startTime: string;
    endTime: string;
  }) => {
    setDateRange(newDateRange);
  };

  const handleSave = () => {
    if (dateRange.startDate && dateRange.endDate) {
      const newArrival = format(dateRange.startDate, 'yyyy-MM-dd');
      const newDeparture = format(dateRange.endDate, 'yyyy-MM-dd');
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
        </DialogHeader>

        <div className="space-y-4">
          <LuxuryDateTimeRangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            placeholder="Select trip dates..."
            showTime={false}
          />
          
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1">
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
