import React from 'react';
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import TripDateDisplay from './TripDateDisplay';
import TripDateEditDialog from './TripDateEditDialog';

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
  const [newArrival, setNewArrival] = React.useState('');
  const [newDeparture, setNewDeparture] = React.useState('');

  // Enhanced state management with persistence of valid dates
  React.useEffect(() => {
    // Only update local state when receiving valid dates
    // Check current state to avoid unnecessary updates
    const isValidNewArrival = arrivalDate && arrivalDate.trim() !== '';
    const isValidNewDeparture = departureDate && departureDate.trim() !== '';
    
    // Only update if the new value is valid AND different from current state
    if (isValidNewArrival && newArrival !== arrivalDate) {
      console.log('Setting valid arrival date:', arrivalDate);
      setNewArrival(arrivalDate);
    } else if (!isValidNewArrival) {
      console.log('Ignoring invalid arrival date:', arrivalDate);
      // If values are now coming in as null but we had a valid date before,
      // we don't update the state, preserving the good value
    }
    
    if (isValidNewDeparture && newDeparture !== departureDate) {
      console.log('Setting valid departure date:', departureDate);
      setNewDeparture(departureDate);
    } else if (!isValidNewDeparture) {
      console.log('Ignoring invalid departure date:', departureDate);
      // Same protection for departure date
    }
    
    console.log('TripDates received prop update:', { arrivalDate, departureDate });
  }, [arrivalDate, departureDate]);

  const handleSave = async () => {
    const { error } = await supabase
      .from('trips')
      .update({
        arrival_date: newArrival,
        departure_date: newDeparture
      })
      .eq('trip_id', tripId);

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
          <TripDateDisplay label="Arrival" date={arrivalDate} />
          <TripDateDisplay label="Departure" date={departureDate} />
        </div>
      </div>

      <Button variant="ghost" size="sm" onClick={() => setIsOpen(true)}>
        Edit Dates
      </Button>

      <TripDateEditDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        arrivalDate={newArrival}
        departureDate={newDeparture}
        onArrivalChange={setNewArrival}
        onDepartureChange={setNewDeparture}
        onSave={handleSave}
      />
    </div>
  );
};

export default TripDates;
