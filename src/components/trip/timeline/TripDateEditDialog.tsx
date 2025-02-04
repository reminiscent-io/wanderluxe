import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface TripDateEditDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  arrivalDate: string;
  departureDate: string;
  onArrivalChange: (date: string) => void;
  onDepartureChange: (date: string) => void;
  onSave: () => void;
}

const TripDateEditDialog = ({
  isOpen,
  onOpenChange,
  arrivalDate,
  departureDate,
  onArrivalChange,
  onDepartureChange,
  onSave,
}: TripDateEditDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Trip Dates</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="arrival">Arrival Date</Label>
            <Input
              id="arrival"
              type="date"
              value={arrivalDate}
              onChange={(e) => onArrivalChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="departure">Departure Date</Label>
            <Input
              id="departure"
              type="date"
              value={departureDate}
              onChange={(e) => onDepartureChange(e.target.value)}
            />
          </div>
          <Button onClick={onSave} className="w-full">
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TripDateEditDialog;