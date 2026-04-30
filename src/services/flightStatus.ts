import { supabase } from '@/integrations/supabase/client';

export interface FlightSegmentStatus {
  airport_iata: string;
  airport_name: string;
  scheduled_time_local: string;
  scheduled_date_local: string;
  revised_time_local: string | null;
  revised_date_local: string | null;
}

export interface FlightStatusResponse {
  flight_iata: string;
  flight_date: string;
  airline: string;
  departure: FlightSegmentStatus;
  arrival: FlightSegmentStatus;
  status: string;
  fetched_at: string;
}

export class FlightNotFoundError extends Error {
  constructor() {
    super('Flight not found');
    this.name = 'FlightNotFoundError';
  }
}

export class RateLimitError extends Error {
  constructor() {
    super('Rate limit exceeded, please try again later');
    this.name = 'RateLimitError';
  }
}

export class UpstreamError extends Error {
  constructor(message = 'Flight data unavailable') {
    super(message);
    this.name = 'UpstreamError';
  }
}

export async function lookupFlightStatus(
  flightIata: string,
  flightDate: string,
): Promise<FlightStatusResponse> {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/flight-status-proxy`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token && {
          Authorization: `Bearer ${session.access_token}`,
        }),
      },
      body: JSON.stringify({
        flight_iata: flightIata.toUpperCase().trim(),
        flight_date: flightDate,
      }),
    },
  );

  if (response.status === 404) throw new FlightNotFoundError();
  if (response.status === 429) throw new RateLimitError();
  if (!response.ok) {
    let message = 'Flight data unavailable';
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new UpstreamError(message);
  }

  return response.json();
}
