import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://wanderluxe.io';
const ALLOWED_ORIGIN_PATTERNS = [/\.replit\.dev(:\d+)?$/, /\.repl\.co(:\d+)?$/, /\.replit\.app(:\d+)?$/];
function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin = (origin && ALLOWED_ORIGIN_PATTERNS.some(p => p.test(origin))) ? origin : ALLOWED_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

interface FlightSegment {
  airport_iata: string;
  airport_name: string;
  scheduled_time_local: string;
  revised_time_local: string | null;
  scheduled_date_local: string;
  revised_date_local: string | null;
}

interface FlightStatusResponse {
  flight_iata: string;
  flight_date: string;
  airline: string;
  departure: FlightSegment;
  arrival: FlightSegment;
  status: string;
  fetched_at: string;
}

const FLIGHT_IATA_REGEX = /^[A-Z0-9]{2}\d{1,4}[A-Z]?$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// AeroDataBox returns times like "2026-05-03 08:00-04:00" in its *.local fields.
// We need just the HH:MM portion and the YYYY-MM-DD portion, preserving the
// airport's local wall-clock time (no timezone conversion).
function splitLocal(local: string | undefined | null): { date: string | null; time: string | null } {
  if (!local) return { date: null, time: null };
  // Expected shape: "YYYY-MM-DD HH:MM<offset>" — offset may be "+HH:MM", "-HH:MM", or "Z"
  const match = local.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
  if (!match) return { date: null, time: null };
  return { date: match[1], time: match[2] };
}

function pickLatest(scheduled: string | undefined, revised: string | undefined, predicted: string | undefined): string | undefined {
  return revised ?? predicted ?? scheduled;
}

function normalizeFlight(raw: any, flightIata: string, flightDate: string): FlightStatusResponse | null {
  if (!raw || !raw.departure || !raw.arrival) return null;

  const depScheduled = splitLocal(raw.departure.scheduledTime?.local);
  const arrScheduled = splitLocal(raw.arrival.scheduledTime?.local);
  if (!depScheduled.date || !depScheduled.time || !arrScheduled.date || !arrScheduled.time) {
    return null;
  }

  const depLatestLocal = pickLatest(
    raw.departure.scheduledTime?.local,
    raw.departure.revisedTime?.local,
    raw.departure.predictedTime?.local,
  );
  const arrLatestLocal = pickLatest(
    raw.arrival.scheduledTime?.local,
    raw.arrival.revisedTime?.local,
    raw.arrival.predictedTime?.local,
  );

  const depLatest = splitLocal(depLatestLocal);
  const arrLatest = splitLocal(arrLatestLocal);

  const depRevised = depLatestLocal && depLatestLocal !== raw.departure.scheduledTime?.local
    ? { time: depLatest.time, date: depLatest.date }
    : { time: null, date: null };
  const arrRevised = arrLatestLocal && arrLatestLocal !== raw.arrival.scheduledTime?.local
    ? { time: arrLatest.time, date: arrLatest.date }
    : { time: null, date: null };

  return {
    flight_iata: flightIata,
    flight_date: flightDate,
    airline: raw.airline?.name ?? raw.airline?.iata ?? '',
    departure: {
      airport_iata: raw.departure.airport?.iata ?? '',
      airport_name: raw.departure.airport?.name ?? raw.departure.airport?.iata ?? '',
      scheduled_time_local: depScheduled.time!,
      scheduled_date_local: depScheduled.date!,
      revised_time_local: depRevised.time,
      revised_date_local: depRevised.date,
    },
    arrival: {
      airport_iata: raw.arrival.airport?.iata ?? '',
      airport_name: raw.arrival.airport?.name ?? raw.arrival.airport?.iata ?? '',
      scheduled_time_local: arrScheduled.time!,
      scheduled_date_local: arrScheduled.date!,
      revised_time_local: arrRevised.time,
      revised_date_local: arrRevised.date,
    },
    status: raw.status ?? 'Unknown',
    fetched_at: new Date().toISOString(),
  };
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const flightIata = typeof body.flight_iata === 'string' ? body.flight_iata.toUpperCase().trim() : '';
    const flightDate = typeof body.flight_date === 'string' ? body.flight_date.trim() : '';

    if (!FLIGHT_IATA_REGEX.test(flightIata)) {
      return new Response(JSON.stringify({ error: 'Invalid flight number format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!DATE_REGEX.test(flightDate)) {
      return new Response(JSON.stringify({ error: 'Invalid flight date format (expected YYYY-MM-DD)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('AERODATABOX_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Flight status API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Cache check
    const { data: cached } = await supabase
      .from('flight_status_cache')
      .select('payload, expires_at')
      .eq('flight_iata', flightIata)
      .eq('flight_date', flightDate)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (cached?.payload) {
      console.log(`Flight status cache hit: ${flightIata} ${flightDate}`);
      return new Response(JSON.stringify(cached.payload), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Flight status cache miss: ${flightIata} ${flightDate}, calling AeroDataBox`);

    // Fetch from AeroDataBox
    const upstreamUrl = `https://aerodatabox.p.rapidapi.com/flights/number/${encodeURIComponent(flightIata)}/${encodeURIComponent(flightDate)}?dateLocalRole=Departure&withAircraftImage=false&withLocation=false`;
    const upstreamRes = await fetch(upstreamUrl, {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com',
      },
    });

    if (upstreamRes.status === 429) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again later' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!upstreamRes.ok) {
      const text = await upstreamRes.text();
      console.error(`AeroDataBox error ${upstreamRes.status}: ${text}`);
      return new Response(JSON.stringify({ error: 'Upstream flight data unavailable' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rawList = await upstreamRes.json();
    if (!Array.isArray(rawList) || rawList.length === 0) {
      return new Response(JSON.stringify({ error: 'Flight not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prefer the entry whose departure local date matches the requested flight_date
    const chosen = rawList.find((entry) => {
      const parsed = splitLocal(entry?.departure?.scheduledTime?.local);
      return parsed.date === flightDate;
    }) ?? rawList[0];

    const normalized = normalizeFlight(chosen, flightIata, flightDate);
    if (!normalized) {
      return new Response(JSON.stringify({ error: 'Flight data incomplete' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cache (30 min TTL)
    await supabase
      .from('flight_status_cache')
      .upsert({
        flight_iata: flightIata,
        flight_date: flightDate,
        payload: normalized,
        fetched_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      }, { onConflict: 'flight_iata,flight_date' });

    return new Response(JSON.stringify(normalized), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('flight-status-proxy error:', error);
    return new Response(JSON.stringify({ error: 'An internal server error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
