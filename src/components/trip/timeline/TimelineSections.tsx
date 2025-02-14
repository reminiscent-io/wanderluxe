
import React from 'react';
import TripDates from './TripDates';
import AccommodationsSection from '../AccommodationsSection';
import TransportationSection from '../TransportationSection';
import { HotelStay } from '@/types/trip';

interface TimelineSectionsProps {
  tripId: string;
  tripDates: {
    arrival_date: string | null;
    departure_date: string | null;
  };
  onDatesChange: () => void;
  onAccommodationChange: () => void;
  onTransportationChange: () => void;
  hotelStays: HotelStay[];
}

const TimelineSections: React.FC<TimelineSectionsProps> = ({
  tripId,
  tripDates,
  onDatesChange,
  onAccommodationChange,
  onTransportationChange,
  hotelStays
}) => {
  return (
    <div className="grid gap-4">
      <TripDates
        tripId={tripId}
        arrivalDate={tripDates.arrival_date}
        departureDate={tripDates.departure_date}
        onDatesChange={onDatesChange}
      />
      <AccommodationsSection
        tripId={tripId}
        onAccommodationChange={onAccommodationChange}
        hotelStays={hotelStays}
      />
      <TransportationSection
        tripId={tripId}
        onTransportationChange={onTransportationChange}
      />
    </div>
  );
};

export default TimelineSections;
