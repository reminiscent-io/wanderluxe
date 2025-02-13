
import { useMemo } from 'react';
import { parseISO } from 'date-fns';
import { useTimelineEvents } from '@/hooks/use-timeline-events';

export const useHotelStayCheck = (tripId: string, date: string) => {
  const { events: hotelStays } = useTimelineEvents(tripId);

  const isWithinHotelStay = useMemo(() => {
    if (!hotelStays) return false;
    const currentDate = parseISO(date);
    
    return hotelStays.some(stay => {
      if (!stay.hotel_checkin_date || !stay.hotel_checkout_date) return false;
      const checkinDate = parseISO(stay.hotel_checkin_date);
      const checkoutDate = parseISO(stay.hotel_checkout_date);
      return currentDate >= checkinDate && currentDate <= checkoutDate;
    });
  }, [date, hotelStays]);

  return isWithinHotelStay;
};
