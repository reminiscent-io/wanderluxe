import { useMemo } from 'react';
import { parseISO, isWithinInterval } from 'date-fns';
import { TimelineEvent, TripDay } from '@/types/trip';

export const useTimelineGroups = (days: TripDay[] | undefined, events: TimelineEvent[] | undefined) => {
  const gaps = useMemo(() => {
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
  }, [events]);

  const groups = useMemo(() => {
    if (!days || !events) return [];

    const sortedDays = [...days].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const hotelStays = events
      .filter(event => event.hotel && event.hotel_checkin_date && event.hotel_checkout_date)
      .sort((a, b) => 
        new Date(a.hotel_checkin_date!).getTime() - new Date(b.hotel_checkin_date!).getTime()
      );

    const groups: Array<{
      hotel?: string;
      hotelDetails?: string;
      checkinDate?: string;
      checkoutDate?: string;
      days: TripDay[];
    }> = [];

    let currentGroup: {
      hotel?: string;
      hotelDetails?: string;
      checkinDate?: string;
      checkoutDate?: string;
      days: TripDay[];
    } | null = null;

    sortedDays.forEach((day) => {
      const dayDate = parseISO(day.date);
      
      const hotelStay = hotelStays.find(stay => {
        if (!stay.hotel_checkin_date || !stay.hotel_checkout_date) return false;
        
        const checkin = parseISO(stay.hotel_checkin_date);
        const checkout = parseISO(stay.hotel_checkout_date);
        
        return isWithinInterval(dayDate, { start: checkin, end: checkout });
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
  }, [days, events]);

  return {
    groups,
    gaps
  };
};