import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarDays, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import TripDateDisplay from './TripDateDisplay';
import TripDateEditDialog from './TripDateEditDialog';
import DateChangeConfirmationDialog from './DateChangeConfirmationDialog';
import { generateDatesArray } from '@/services/accommodation/dateUtils';
import { createTripDays } from '@/services/tripDaysService';

interface TripDatesProps {
  tripId: string;
  arrivalDate?: string | null;
  departureDate?: string | null;
  onDatesChange: (dates: { arrival_date?: string; departure_date?: string }) => void;
}

const TripDates: React.FC<TripDatesProps> = ({
  tripId,
  arrivalDate,
  departureDate,
  onDatesChange,
}) => {
  // Dialog & form state
  const [isOpen, setIsOpen] = useState(false);
  const [newArrival, setNewArrival] = useState('');
  const [newDeparture, setNewDeparture] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirmation dialog state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<{
    arrival_date?: string;
    departure_date?: string;
  } | null>(null);
  const [daysToRemove, setDaysToRemove] = useState<{
    dayCount: number;
    activityCount: number;
    dates: string[];
  }>({ dayCount: 0, activityCount: 0, dates: [] });

  // Sync props → local
  useEffect(() => {
    const validA = !!arrivalDate?.trim();
    const validD = !!departureDate?.trim();
    if (validA && newArrival !== arrivalDate) setNewArrival(arrivalDate!);
    if (validD && newDeparture !== departureDate) setNewDeparture(departureDate!);
  }, [arrivalDate, departureDate]);

  // Helpers for trip-day CRUD (identical to before)…
  const checkDaysToRemove = async (oldArr: string, oldDep: string, newArr: string, newDep: string) => {
    const oldDates = generateDatesArray(oldArr, oldDep);
    const newDates = generateDatesArray(newArr, newDep);
    const toRemove = oldDates.filter(d => !newDates.includes(d));
    if (!toRemove.length) return null;

    let activityCount = 0;
    try {
      const { data: daysData, error: daysErr } = await supabase
        .from('trip_days')
        .select('day_id')
        .eq('trip_id', tripId)
        .in('date', toRemove);
      if (daysErr) throw daysErr;

      if (daysData?.length) {
        const ids = daysData.map(d => d.day_id);
        const { count, error: actErr } = await supabase
          .from('day_activities')
          .select('*', { head: true, count: 'exact' })
          .in('day_id', ids);
        if (actErr) throw actErr;
        activityCount = count || 0;
      }

      return { dayCount: toRemove.length, activityCount, dates: toRemove };
    } catch (err) {
      console.error(err);
      toast.error('Failed to check affected days');
      return null;
    }
  };

  const addNewTripDays = async (oldArr: string, oldDep: string, newArr: string, newDep: string) => {
    const oldDates = generateDatesArray(oldArr, oldDep);
    const newDates = generateDatesArray(newArr, newDep);
    const toAdd = newDates.filter(d => !oldDates.includes(d));
    if (!toAdd.length) return;
    try {
      await createTripDays(tripId, toAdd);
    } catch (err) {
      console.error(err);
      toast.error('Failed to add new trip days');
    }
  };

  const removeTripDays = async (dates: string[]) => {
    const { data: daysData, error: daysErr } = await supabase
      .from('trip_days')
      .select('day_id')
      .eq('trip_id', tripId)
      .in('date', dates);
    if (daysErr) throw daysErr;

    if (daysData?.length) {
      const ids = daysData.map(d => d.day_id);
      await supabase.from('day_activities').delete().in('day_id', ids);
      await supabase.from('trip_days').delete().in('day_id', ids);
    }
  };

  const saveDateChanges = async (arr: string, dep: string) => {
    const { error } = await supabase
      .from('trips')
      .update({ arrival_date: arr, departure_date: dep })
      .eq('trip_id', tripId);
    if (error) throw error;

    if (arrivalDate && departureDate) {
      await addNewTripDays(arrivalDate, departureDate, arr, dep);
    } else {
      const allDates = generateDatesArray(arr, dep);
      await createTripDays(tripId, allDates);
    }

    toast.success('Trip dates updated');
    onDatesChange({ arrival_date: arr, departure_date: dep });
    setIsOpen(false);
    setIsSubmitting(false);
  };

  // Save & confirm handlers…
  const handleSave = async () => {
    if (!newArrival || !newDeparture) {
      toast.error('Both arrival and departure dates are required');
      return;
    }
    setIsSubmitting(true);

    if (arrivalDate && departureDate) {
      const info = await checkDaysToRemove(arrivalDate, departureDate, newArrival, newDeparture);
      if (info?.dayCount) {
        setPendingChanges({ arrival_date: newArrival, departure_date: newDeparture });
        setDaysToRemove(info);
        setShowConfirmation(true);
        setIsSubmitting(false);
        return;
      }
    }

    try {
      await saveDateChanges(newArrival, newDeparture);
    } catch {
      toast.error('Failed to update trip dates');
      setIsSubmitting(false);
    }
  };

  const handleConfirmDateChange = async () => {
    if (!pendingChanges) return;
    setIsSubmitting(true);
    setShowConfirmation(false);

    try {
      await removeTripDays(daysToRemove.dates);
      await saveDateChanges(pendingChanges.arrival_date!, pendingChanges.departure_date!);
      setPendingChanges(null);
    } catch {
      toast.error('Failed to update trip dates');
      setIsSubmitting(false);
    }
  };

  // Collapse state
  const [isCollapsed, setIsCollapsed] = useState(true);
  const toggleCollapse = () => setIsCollapsed(prev => !prev);

  return (
    <div className="bg-sand-50 rounded-lg shadow-md overflow-hidden w-full">
      {/* HEADER */}
      <Button
        variant="ghost"
        onClick={toggleCollapse}
        className="w-full flex items-center justify-between p-6 hover:bg-sand-100"
      >
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-earth-600" />
          <span className="text-lg font-medium">Trip Dates</span>
        </div>
        <Plus className="h-5 w-5" />
      </Button>

      {/* EXPANDED CONTENT */}
      {!isCollapsed && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-100/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-8">
            <TripDateDisplay label="Arrival" date={arrivalDate} />
            <TripDateDisplay label="Departure" date={departureDate} />
          </div>

          {/* CENTER-JUSTIFIED EDIT BUTTON */}
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(true)}
              disabled={isSubmitting}
            >
              Edit Dates
            </Button>
          </div>
        </div>
      )}

      {/* DIALOGS */}
      <TripDateEditDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        arrivalDate={newArrival}
        departureDate={newDeparture}
        onArrivalChange={setNewArrival}
        onDepartureChange={setNewDeparture}
        onSave={handleSave}
      />

      <DateChangeConfirmationDialog
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        onConfirm={handleConfirmDateChange}
        dayCount={daysToRemove.dayCount}
        activityCount={daysToRemove.activityCount}
      />
    </div>
  );
};

export default TripDates;
