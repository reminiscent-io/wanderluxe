import React, { useEffect } from 'react';
import { useTimelineEvents } from '@/hooks/use-timeline-events';
import { useTripDays } from '@/hooks/use-trip-days';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { parseISO } from 'date-fns';
import AccommodationsSection from "./AccommodationsSection";
import TransportationSection from "./TransportationSection";
import DayCard from "./DayCard";
import AccommodationGroup from './accommodation/AccommodationGroup';
import { generateDaysBetweenDates } from '@/utils/dateUtils';
import { supabase } from '@/integrations/supabase/client';

interface TimelineViewProps {
  tripId: string | undefined;
}

const TimelineView: React.FC<TimelineViewProps> = ({ tripId }) => {
  const { events, isLoading: eventsLoading, updateEvent, deleteEvent, refetch } = useTimelineEvents(tripId);
  const { days, isLoading: daysLoading, addDay } = useTripDays(tripId);

  useEffect(() => {
    const initializeDays = async () => {
      if (!tripId) return;
      
      const { data: trip } = await supabase
        .from('trips')
        .select('arrival_date, departure_date')
        .eq('id', tripId)
        .single();

      if (!trip?.arrival_date || !trip?.departure_date) return;

      const daysList = generateDaysBetweenDates(trip.arrival_date, trip.departure_date);
      
      for (const day of daysList) {
        await addDay.mutateAsync({
          tripId,
          date: day.date,
          title: day.title
        });
      }
    };

    if (!days?.length) {
      initializeDays();
    }
  }, [tripId, days, addDay]);

  const findAccommodationGaps = () => {
    if (!events?.length) return [];

    const gaps: { startDate: string; endDate: string }[] = [];
    const hotelStays = events
      .filter(event => event.hotel && event.hotel_checkin_date && event.hotel_checkout_date)
      .sort((a, b) => new Date(a.hotel_checkin_date!).getTime() - new Date(b.hotel_checkin_date!).getTime());

    if (!hotelStays.length) return [];

    for (let i = 0; i < hotelStays.length - 1; i++) {
      const currentStayEnd = new Date(hotelStays[i].hotel_checkout_date!);
      const nextStayStart = new Date(hotelStays[i + 1].hotel_checkin_date!);

      if ((nextStayStart.getTime() - currentStayEnd.getTime()) > 24 * 60 * 60 * 1000) {
        gaps.push({
          startDate: hotelStays[i].hotel_checkout_date!,
          endDate: hotelStays[i + 1].hotel_checkin_date!
        });
      }
    }

    return gaps;
  };

  if (eventsLoading || daysLoading) {
    return <div>Loading timeline...</div>;
  }

  const uniqueHotelStays = events?.reduce((acc: any[], event) => {
    if (event.hotel && event.hotel_checkin_date) {
      const stayKey = `${event.hotel}-${event.hotel_checkin_date}`;
      if (!acc.find(stay => `${stay.hotel}-${stay.hotel_checkin_date}` === stayKey)) {
        acc.push(event);
      }
    }
    return acc;
  }, []) || [];

  const accommodationGaps = findAccommodationGaps();

  const groupDaysByAccommodation = () => {
    if (!days) return [];

    const groups: any[] = [];
    let currentGroup: any = null;

    days.forEach((day) => {
      const dayDate = day.date;
      const hotelStay = events?.find(event => {
        if (!event.hotel || !event.hotel_checkin_date || !event.hotel_checkout_date) return false;
        const checkin = parseISO(event.hotel_checkin_date);
        const checkout = parseISO(event.hotel_checkout_date);
        const current = parseISO(dayDate);
        return current >= checkin && current < checkout;
      });

      if (hotelStay) {
        if (!currentGroup || currentGroup.hotel !== hotelStay.hotel) {
          if (currentGroup) {
            groups.push(currentGroup);
          }
          currentGroup = {
            hotel: hotelStay.hotel,
            hotelDetails: hotelStay.hotel_details,
            checkinDate: hotelStay.hotel_checkin_date,
            checkoutDate: hotelStay.hotel_checkout_date,
            days: []
          };
        }
        currentGroup.days.push(day);
      } else {
        if (currentGroup) {
          groups.push(currentGroup);
          currentGroup = null;
        }
        groups.push({ days: [day] });
      }
    });

    if (currentGroup) {
      groups.push(currentGroup);
    }

    return groups;
  };

  const groups = groupDaysByAccommodation();

  return (
    <div className="space-y-8">
      <AccommodationsSection 
        tripId={tripId || ''} 
        onAccommodationChange={refetch}
        hotelStays={uniqueHotelStays}
      />

      <TransportationSection
        tripId={tripId || ''}
        onTransportationChange={refetch}
      />

      {accommodationGaps.map((gap, index) => (
        <Alert key={index} variant="destructive" className="bg-orange-50 border-orange-200">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <AlertDescription className="text-orange-700">
            No accommodation planned between {new Date(gap.startDate).toLocaleDateString()} and{' '}
            {new Date(gap.endDate).toLocaleDateString()}
          </AlertDescription>
        </Alert>
      ))}

      <div className="space-y-12">
        {groups.map((group, groupIndex) => (
          group.hotel ? (
            <AccommodationGroup
              key={`${group.hotel}-${groupIndex}`}
              hotel={group.hotel}
              hotelDetails={group.hotelDetails}
              checkinDate={group.checkinDate}
              checkoutDate={group.checkoutDate}
            >
              {group.days.map((day: any, dayIndex: number) => (
                <DayCard
                  key={day.id}
                  id={day.id}
                  date={day.date}
                  title={day.title}
                  description={day.description}
                  activities={day.activities || []}
                  onAddActivity={() => {}}
                  index={dayIndex}
                  onDelete={() => {}}
                />
              ))}
            </AccommodationGroup>
          ) : (
            <div key={`standalone-${groupIndex}`} className="space-y-6">
              {group.days.map((day: any, dayIndex: number) => (
                <DayCard
                  key={day.id}
                  id={day.id}
                  date={day.date}
                  title={day.title}
                  description={day.description}
                  activities={day.activities || []}
                  onAddActivity={() => {}}
                  index={dayIndex}
                  onDelete={() => {}}
                />
              ))}
            </div>
          )
        ))}
      </div>
    </div>
  );
};

export default TimelineView;