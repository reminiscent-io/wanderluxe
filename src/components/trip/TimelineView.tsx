import React, { useEffect, useState } from 'react';
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

interface TimelineViewProps {
  tripId: string;
  onAddAccommodation?: (dates: { startDate: string; endDate: string }) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const TimelineView: React.FC<TimelineViewProps> = ({
  tripId,
  onAddAccommodation,
  onEdit,
  onDelete
}) => {
  const { days, refreshDays } = useTripDays(tripId);
  const { events, refreshEvents } = useTimelineEvents(tripId);
  const { groups, gaps } = useTimelineGroups(days, events);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tripDates, setTripDates] = useState<{ arrival_date: string | null; departure_date: string | null }>({
    arrival_date: null,
    departure_date: null
  });

  const fetchTripDates = async () => {
    const { data, error } = await supabase
      .from('trips')
      .select('arrival_date, departure_date')
      .eq('trip_id', tripId)
      .single();

    if (error) {
      console.error('Error fetching trip dates:', error);
      return;
    }

    setTripDates(data);
  };

  useEffect(() => {
    fetchTripDates();
  }, [tripId]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    refreshEvents();
    refreshDays();
    fetchTripDates();
    setIsRefreshing(false);
  };

  useEffect(() => {
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
          refreshEvents();
          toast.success('Timeline updated');
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
          refreshDays();
          toast.success('Days updated');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, refreshEvents, refreshDays]);

  const hotelStays = events?.filter(event => event.hotel) || [];

  return (
    <div className="relative space-y-8">
      <div className="absolute right-0 top-0 flex gap-2 z-10">
        {onEdit && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            className="bg-white/80 backdrop-blur-sm hover:bg-white"
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
          hotelStays={hotelStays.map(event => ({
            id: event.stay_id,
            hotel: event.hotel || '',
            hotel_details: event.hotel_details,
            hotel_url: event.hotel_url,
            hotel_checkin_date: event.hotel_checkin_date || '',
            hotel_checkout_date: event.hotel_checkout_date || '',
            expense_cost: event.expense_cost,
            currency: event.currency,
            hotel_address: event.hotel_address,
            hotel_phone: event.hotel_phone,
            hotel_place_id: event.hotel_place_id,
            hotel_website: event.hotel_website,
          }))}
        />
        <TransportationSection
          tripId={tripId}
          onTransportationChange={handleRefresh}
        />
      </div>

      <TimelineContent groups={groups} />
      <AccommodationGaps gaps={gaps} onAddAccommodation={onAddAccommodation || (() => {})} />
    </div>
  );
};

export default TimelineView;
