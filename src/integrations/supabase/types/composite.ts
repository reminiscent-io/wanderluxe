import { TransportationType } from './enums';

// Define composite types if needed in the future
// Currently, there are no composite types defined

export type TransportationEventComposite = {
  id: string;
  trip_id: string;
  type: TransportationType;
  provider: string | null;
  details: string | null;
  departure_location: string | null;
  arrival_location: string | null;
  start_date: string;
  start_time: string | null;
  end_date: string | null;
  end_time: string | null;
  confirmation_number: string | null;
  cost: number | null;
  currency: string | null;
  created_at: string;
};
