import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return respond({ error: 'Method not allowed' }, 405);

  try {
    await requireAuth(req);
  } catch {
    return respond({ error: 'Unauthorized' }, 401);
  }

  // Soft-failure contract: any resolution problem yields { timeZoneId: null }
  // so the caller's form simply does not auto-fill.
  let placeId: unknown;
  try {
    ({ placeId } = await req.json());
  } catch {
    return respond({ timeZoneId: null });
  }
  if (typeof placeId !== 'string' || !placeId.trim()) return respond({ timeZoneId: null });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: cached } = await supabase
    .from('timezone_cache')
    .select('timezone_id')
    .eq('place_id', placeId)
    .maybeSingle();
  if (cached?.timezone_id) return respond({ timeZoneId: cached.timezone_id });

  const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!googleApiKey) return respond({ timeZoneId: null });

  try {
    const detailsRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=geometry&key=${googleApiKey}`,
    );
    const details = await detailsRes.json();
    const loc = details?.result?.geometry?.location;
    if (typeof loc?.lat !== 'number' || typeof loc?.lng !== 'number') {
      return respond({ timeZoneId: null });
    }

    // The timestamp only affects DST offsets in the response; timeZoneId itself
    // is stable, which is what makes the permanent cache safe.
    const timestamp = Math.floor(Date.now() / 1000);
    const tzRes = await fetch(
      `https://maps.googleapis.com/maps/api/timezone/json?location=${loc.lat},${loc.lng}&timestamp=${timestamp}&key=${googleApiKey}`,
    );
    const tz = await tzRes.json();
    if (tz?.status !== 'OK' || typeof tz?.timeZoneId !== 'string') {
      return respond({ timeZoneId: null });
    }

    await supabase.from('timezone_cache').upsert(
      { place_id: placeId, timezone_id: tz.timeZoneId, fetched_at: new Date().toISOString() },
      { onConflict: 'place_id' },
    );
    return respond({ timeZoneId: tz.timeZoneId });
  } catch (e) {
    console.error('timezone-proxy resolution error:', e instanceof Error ? e.message : e);
    return respond({ timeZoneId: null });
  }
});
