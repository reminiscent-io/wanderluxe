
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useTimelineEvents } from '@/hooks/use-timeline-events';
import { useTimelineGroups } from '@/hooks/use-timeline-groups';
import { useTripDays } from '@/hooks/use-trip-days';
import TimelineContent from './timeline/TimelineContent';
import AccommodationGaps from './timeline/AccommodationGaps';
import AccommodationsSection from './AccommodationsSection';
import TransportationSection from './TransportationSection';
import TripDates from './timeline/TripDates';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { HotelStay } from '@/types/trip';

interface TimelineViewProps {
  tripId: string;
  onAddAccommodation?: (dates: { startDate: string; endDate: string }) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const TimelineView: React.FC<TimelineViewProps> = ({
  tripId,
  onAddAccommodation = () => {},
  onEdit,
  onDelete
}) => {
  const { days, refreshDays } = useTripDays(tripId);
  const { events, refreshEvents } = useTimelineEvents(tripId);
  const { groups, gaps } = useTimelineGroups(days, events);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tripDates, setTripDates] = useState<{ 
    arrival_date: string | null; 
    departure_date: string | null; 
  }>({ arrival_date: null, departure_date: null });

  // Sort all days chronologically once to establish the correct day numbers
  const sortedDays = useMemo(() => {
    if (!days) return [];
    return [...days].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [days]);

  // Create a map of day_id to its index (1-based) in the chronological order
  const dayIndexMap = useMemo(() => {
    const map = new Map();
    sortedDays.forEach((day, index) => {
      map.set(day.day_id, index + 1); // Add 1 to make it 1-based
    });
    return map;
  }, [sortedDays]);

  const fetchTripDates = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('arrival_date, departure_date')
        .eq('trip_id', tripId)
        .single();

      if (error) throw error;
      setTripDates(data);
    } catch (error) {
      console.error('Error fetching trip dates:', error);
      toast.error('Failed to load trip dates');
    }
  }, [tripId]);

  useEffect(() => {
    fetchTripDates();
  }, [fetchTripDates]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refreshEvents(), refreshDays(), fetchTripDates()]);
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshEvents, refreshDays, fetchTripDates]);

  useEffect(() => {
    const abortController = new AbortController();
    const channel = supabase
      .channel('timeline_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accommodations',
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          if (!abortController.signal.aborted) {
            refreshEvents();
            console.log('Timeline accommodation updated');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_days',
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          if (!abortController.signal.aborted) {
            refreshDays();
            console.log('Timeline days updated');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'day_activities',
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          if (!abortController.signal.aborted) {
            refreshDays();
            console.log('Timeline activities updated');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accommodations_days',
          filter: `stay_id=in.(select stay_id from accommodations where trip_id=eq.${tripId})`,
        },
        () => {
          if (!abortController.signal.aborted) {
            refreshEvents();
            console.log('Timeline accommodation days updated');
          }
        }
      )
      .subscribe();

    return () => {
      abortController.abort();
      supabase.removeChannel(channel);
    };
  }, [tripId, refreshEvents, refreshDays]);

  // Convert events to HotelStay type with proper number conversion for cost
  const hotelStays = useMemo(() => 
    events?.filter(event => event.hotel && event.stay_id).map(event => ({
      stay_id: event.stay_id,
      trip_id: tripId,
      hotel: event.hotel || '',
      hotel_details: event.hotel_details,
      hotel_url: event.hotel_url,
      hotel_checkin_date: event.hotel_checkin_date || '',
      hotel_checkout_date: event.hotel_checkout_date || '',
      cost: event.cost ? Number(event.cost) : null,  // Convert to number or null
      currency: event.currency || 'USD',
      hotel_address: event.hotel_address,
      hotel_phone: event.hotel_phone,
      hotel_place_id: event.hotel_place_id,
      hotel_website: event.hotel_website,
      created_at: event.created_at,
    })) || []
  , [events, tripId]);

  return (
    <div className="relative space-y-8">
      {isRefreshing && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-20" />
      )}

      <div className="absolute right-0 top-0 flex gap-2 z-10">
        {onEdit && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            className="bg-white/80 backdrop-blur-sm hover:bg-white"
            disabled={isRefreshing}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="bg-white/80 backdrop-blur-sm hover:bg-white/90"
            disabled={isRefreshing}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        <TripDates
          tripId={tripId}
          arrivalDate={tripDates.arrival_date}
          departureDate={tripDates.departure_date}
          onDatesChange={fetchTripDates}
        />
        <AccommodationsSection
          tripId={tripId}
          onAccommodationChange={handleRefresh}
          hotelStays={hotelStays}
        />
        <TransportationSection
          tripId={tripId}
          onTransportationChange={handleRefresh}
        />
      </div>

      <TimelineContent groups={groups} dayIndexMap={dayIndexMap} />
      <AccommodationGaps 
        gaps={gaps} 
        onAddAccommodation={onAddAccommodation} 
      />
    </div>
  );
};

export default TimelineView;
