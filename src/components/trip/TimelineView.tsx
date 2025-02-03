import React from 'react';
import FlightCard from "./FlightCard";
import DayCard from "./DayCard";
import TransportationSection from "./TransportationSection";
import AccommodationsSection from "./AccommodationsSection";
import { useTimelineEvents } from '@/hooks/use-timeline-events';
import { useTripDays } from '@/hooks/use-trip-days';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { parseISO, startOfDay } from 'date-fns';

interface TimelineViewProps {
  tripId: string | undefined;
}

const TimelineView: React.FC<TimelineViewProps> = ({ tripId }) => {
  const { events, isLoading: eventsLoading, updateEvent, deleteEvent, refetch } = useTimelineEvents(tripId);
  const { days, isLoading: daysLoading, addActivity } = useTripDays(tripId);

  const findAccommodationGaps = () => {
    if (!events?.length) return [];

    const gaps: { startDate: string; endDate: string }[] = [];
    const hotelStays = events
      .filter(event => event.hotel && event.hotel_checkin_date && event.hotel_checkout_date)
      .sort((a, b) => new Date(a.hotel_checkin_date!).getTime() - new Date(b.hotel_checkin_date!).getTime());

    if (!hotelStays.length) return [];

    // Check for gaps between consecutive stays
    for (let i = 0; i < hotelStays.length - 1; i++) {
      const currentStayEnd = new Date(hotelStays[i].hotel_checkout_date!);
      const nextStayStart = new Date(hotelStays[i + 1].hotel_checkin_date!);

      // If there's a gap between stays (more than one day)
      if ((nextStayStart.getTime() - currentStayEnd.getTime()) > 24 * 60 * 60 * 1000) {
        gaps.push({
          startDate: hotelStays[i].hotel_checkout_date!,
          endDate: hotelStays[i + 1].hotel_checkin_date!
        });
      }
    }

    return gaps;
  };

  const handleAddActivity = (dayId: string) => {
    // TODO: Implement activity form dialog
    console.log('Adding activity to day:', dayId);
  };

  if (eventsLoading || daysLoading) {
    return <div>Loading timeline...</div>;
  }

  // Filter unique hotel stays
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
        {days?.map((day, index) => {
          // Find all hotel stays that overlap with this day
          const dayDate = startOfDay(parseISO(day.date));
          const dayHotel = events?.find(event => 
            event.hotel && 
            event.hotel_checkin_date && 
            event.hotel_checkout_date &&
            dayDate >= startOfDay(parseISO(event.hotel_checkin_date)) && 
            dayDate < startOfDay(parseISO(event.hotel_checkout_date))
          );

          const hotelDetails = dayHotel ? {
            name: dayHotel.hotel || '',
            details: dayHotel.hotel_details || '',
            imageUrl: dayHotel.image_url
          } : undefined;

          return (
            <DayCard
              key={day.id}
              date={day.date}
              title={day.title}
              description={day.description}
              activities={day.activities}
              onAddActivity={() => handleAddActivity(day.id)}
              index={index}
              hotelDetails={hotelDetails}
            />
          );
        })}
      </div>
    </div>
  );
};

export default TimelineView;