import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarDays } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

interface TripDatesProps {
  tripId: string;
  arrivalDate?: string | null;
  departureDate?: string | null;
  onDatesChange: () => void;
}

const TripDates: React.FC<TripDatesProps> = ({ 
  tripId, 
  arrivalDate, 
  departureDate,
  onDatesChange 
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [newArrival, setNewArrival] = React.useState(arrivalDate || '');
  const [newDeparture, setNewDeparture] = React.useState(departureDate || '');

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return format(parseISO(dateString), 'EEEE MMMM d, yyyy');
  };

  const handleSave = async () => {
    const { error } = await supabase
      .from('trips')
      .update({
        arrival_date: newArrival,
        departure_date: newDeparture
      })
      .eq('id', tripId);

    if (error) {
      console.error('Error updating trip dates:', error);
      toast.error('Failed to update trip dates');
      return;
    }

    toast.success('Trip dates updated');
    onDatesChange();
    setIsOpen(false);
  };

  return (
    <div className="mb-8 flex items-center justify-between bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-sm">
      <div className="flex items-center gap-4">
        <CalendarDays className="h-5 w-5 text-earth-600" />
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="text-sm text-gray-500 italic mb-1">Arrival</p>
            <p className="font-medium">
              {arrivalDate ? formatDate(arrivalDate) : 'Not set'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 italic mb-1">Departure</p>
            <p className="font-medium">
              {departureDate ? formatDate(departureDate) : 'Not set'}
            </p>
          </div>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm">
            Edit Dates
          </Button>
        </DialogTrigger>
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
                value={newArrival}
                onChange={(e) => setNewArrival(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="departure">Departure Date</Label>
              <Input
                id="departure"
                type="date"
                value={newDeparture}
                onChange={(e) => setNewDeparture(e.target.value)}
              />
            </div>
            <Button onClick={handleSave} className="w-full">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TripDates;