
import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";
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
  onDatesChange 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newArrival, setNewArrival] = useState('');
  const [newDeparture, setNewDeparture] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Confirmation state
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

  // Enhanced state management with persistence of valid dates
  useEffect(() => {
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

  // Check if days would be removed when dates change
  const checkDaysToRemove = async (oldArrival: string, oldDeparture: string, newArrival: string, newDeparture: string) => {
    // Generate date arrays
    const oldDates = generateDatesArray(oldArrival, oldDeparture);
    const newDates = generateDatesArray(newArrival, newDeparture);
    
    // Find dates that are in oldDates but not in newDates
    const datesToRemove = oldDates.filter(date => !newDates.includes(date));
    
    if (datesToRemove.length === 0) {
      return null; // No days to remove
    }
    
    // Count activities for these days
    let activityCount = 0;
    try {
      // Get trip days to be removed
      const { data: daysData, error: daysError } = await supabase
        .from('trip_days')
        .select('day_id')
        .eq('trip_id', tripId)
        .in('date', datesToRemove);
      
      if (daysError) throw daysError;
      
      if (daysData && daysData.length > 0) {
        const dayIds = daysData.map(day => day.day_id);
        
        // Count activities in these days
        const { count, error: activitiesError } = await supabase
          .from('day_activities')
          .select('*', { count: 'exact', head: true })
          .in('day_id', dayIds);
        
        if (activitiesError) throw activitiesError;
        
        activityCount = count || 0;
      }
      
      return {
        dayCount: datesToRemove.length,
        activityCount,
        dates: datesToRemove
      };
    } catch (error) {
      console.error('Error checking days to remove:', error);
      toast.error('Failed to check affected days');
      return null;
    }
  };

  // Add new trip days when extending a trip
  const addNewTripDays = async (oldArrival: string, oldDeparture: string, newArrival: string, newDeparture: string) => {
    // Generate date arrays
    const oldDates = generateDatesArray(oldArrival, oldDeparture);
    const newDates = generateDatesArray(newArrival, newDeparture);
    
    // Find dates that are in newDates but not in oldDates (new days to add)
    const datesToAdd = newDates.filter(date => !oldDates.includes(date));
    
    if (datesToAdd.length === 0) {
      return; // No new days to add
    }
    
    try {
      // Create trip days for the new dates
      await createTripDays(tripId, datesToAdd);
      console.log(`Added ${datesToAdd.length} new trip days`);
    } catch (error) {
      console.error('Error adding new trip days:', error);
      toast.error('Failed to add new trip days');
    }
  };

  // Remove days and their activities
  const removeTripDays = async (dates: string[]) => {
    try {
      // Get trip day IDs for these dates
      const { data: daysData, error: daysError } = await supabase
        .from('trip_days')
        .select('day_id')
        .eq('trip_id', tripId)
        .in('date', dates);
      
      if (daysError) throw daysError;
      
      if (daysData && daysData.length > 0) {
        const dayIds = daysData.map(day => day.day_id);
        
        // Delete activities for these days
        const { error: activitiesError } = await supabase
          .from('day_activities')
          .delete()
          .in('day_id', dayIds);
        
        if (activitiesError) throw activitiesError;
        
        // Delete the trip days
        const { error: deleteDaysError } = await supabase
          .from('trip_days')
          .delete()
          .in('day_id', dayIds);
        
        if (deleteDaysError) throw deleteDaysError;
        
        console.log(`Removed ${dayIds.length} trip days and their activities`);
      }
    } catch (error) {
      console.error('Error removing trip days:', error);
      throw error; // Rethrow to be caught by caller
    }
  };

  const handleSave = async () => {
    // Validate dates before saving
    if (!newArrival || !newDeparture) {
      toast.error('Both arrival and departure dates are required');
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if we're shortening the trip and days will be removed
      if (arrivalDate && departureDate) {
        const daysRemovalInfo = await checkDaysToRemove(
          arrivalDate, 
          departureDate, 
          newArrival, 
          newDeparture
        );

        if (daysRemovalInfo && daysRemovalInfo.dayCount > 0) {
          // Store pending changes and show confirmation dialog
          setPendingChanges({
            arrival_date: newArrival,
            departure_date: newDeparture
          });
          setDaysToRemove(daysRemovalInfo);
          setShowConfirmation(true);
          setIsSubmitting(false);
          return; // Exit early, waiting for confirmation
        }
      }

      // Either no days to remove or user confirmed the changes
      await saveDateChanges(newArrival, newDeparture);
    } catch (error) {
      console.error('Error processing date change:', error);
      toast.error('Failed to update trip dates. Please try again');
      setIsSubmitting(false);
    }
  };

  const handleConfirmDateChange = async () => {
    if (!pendingChanges) return;
    
    setIsSubmitting(true);
    setShowConfirmation(false);
    
    try {
      // Remove the affected days
      await removeTripDays(daysToRemove.dates);
      
      // Save the new dates
      await saveDateChanges(
        pendingChanges.arrival_date || newArrival, 
        pendingChanges.departure_date || newDeparture
      );
      
      // Clear pending changes
      setPendingChanges(null);
    } catch (error) {
      console.error('Error applying confirmed changes:', error);
      toast.error('Failed to update trip dates');
      setIsSubmitting(false);
    }
  };

  const saveDateChanges = async (arrival: string, departure: string) => {
    try {
      // Update the trip dates in the database
      const { error } = await supabase
        .from('trips')
        .update({
          arrival_date: arrival,
          departure_date: departure
        })
        .eq('trip_id', tripId);

      if (error) throw error;

      // If we're extending the trip, add new trip days
      if (arrivalDate && departureDate) {
        await addNewTripDays(arrivalDate, departureDate, arrival, departure);
      } else if (arrival && departure) {
        // First time setting dates, create all trip days
        const allDates = generateDatesArray(arrival, departure);
        await createTripDays(tripId, allDates);
      }

      toast.success('Trip dates updated');

      // Notify parent if callback exists and dates are valid
      if (onDatesChange && arrival && departure) {
        onDatesChange({
          arrival_date: arrival,
          departure_date: departure
        });
      }

      // Close dialog
      setIsOpen(false);
    } catch (error) {
      console.error('Error saving date changes:', error);
      throw error; // Rethrow to be caught by caller
    } finally {
      setIsSubmitting(false);
    }
  };

  const [isCollapsed, setIsCollapsed] = useState(true);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="h-full bg-white/0 rounded-lg shadow-sm text-sm sm:text-base overflow-hidden">
      <div 
        className="p-4 flex items-center justify-between cursor-pointer" 
        onClick={toggleCollapse}
      >
        <div className="flex items-center gap-3">
          <CalendarDays className="h-5 w-5 text-earth-600 flex-shrink-0" />
          <h3 className="font-medium text-sm">Trip Dates</h3>
        </div>
        <div className="flex items-center gap-2">
          {!isCollapsed && (
            <Button variant="ghost" size="sm" onClick={(e) => {
              e.stopPropagation();
              setIsOpen(true);
            }} className="shadow-sm">
              Edit Dates
            </Button>
          )}
          <div className="transition-transform duration-200" style={{ transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <svg width="14" height="8" viewBox="0 0 14 8" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L7 7L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
      
      {!isCollapsed && (
        <div className="px-4 pb-4 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-8 pt-2 border-t border-gray-100/50">
            <TripDateDisplay label="Arrival" date={arrivalDate} />
            <TripDateDisplay label="Departure" date={departureDate} />
          </div>
        </div>
      )}

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
