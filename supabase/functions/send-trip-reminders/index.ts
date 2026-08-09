// deno-lint-ignore-file no-explicit-any
// WanderLuxe — Trip Reminder Email (Supabase Edge Function)
// Fires hourly via pg_cron; only emails when it is 20:00 in America/New_York.
// Sends a single reminder per trip 3 days before arrival_date to every
// registered traveler in trip_shares.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const DEFAULT_VIEW_URL = 'https://wanderluxe.io';
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://wanderluxe.io';
const ALLOWED_ORIGIN_PATTERNS = [/\.replit\.dev(:\d+)?$/, /\.repl\.co(:\d+)?$/, /\.replit\.app(:\d+)?$/];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin = origin && ALLOWED_ORIGIN_PATTERNS.some((p) => p.test(origin)) ? origin : ALLOWED_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };
}

const MAILGUN_API_KEY = Deno.env.get('MAILGUN_API_KEY');
const MAILGUN_DOMAIN = Deno.env.get('MAILGUN_DOMAIN') || 'mail.wanderluxe.io';

const COLORS = {
  sand50: '#f8f5f0',
  sand200: '#e9e3da',
  earth600: '#7c5e45',
  text: '#2a2521',
  muted: '#6b655f',
};

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]!));

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && !/[\r\n]/.test(s);

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function formatTime(t: string | null): string {
  if (!t) return '';
  // "HH:MM:SS" or "HH:MM"
  const [hStr, mStr] = t.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return t;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

type TripRow = {
  trip_id: string;
  destination: string;
  primary_destination: string | null;
  arrival_date: string;
  departure_date: string;
};

type Accommodation = {
  stay_id: string;
  hotel: string | null;
  hotel_checkin_date: string | null;
  checkin_time: string | null;
  hotel_address: string | null;
};

type Flight = {
  provider: string | null;
  confirmation_number: string | null;
  start_date: string;
  start_time: string | null;
  departure_location: string | null;
  arrival_location: string | null;
};

type TravelerShare = {
  id: string;
  first_name: string;
  last_name: string | null;
  shared_with_user_id: string;
};

function renderHtml(params: {
  firstName: string;
  tripLabel: string;
  tripDates: string;
  accommodations: Array<{ name: string; when: string; address: string; travelers: string }>;
  flights: Array<{ title: string; route: string; when: string }>;
  viewUrl: string;
}): string {
  const { firstName, tripLabel, tripDates, accommodations, flights, viewUrl } = params;

  const hotelsSection = accommodations.length
    ? accommodations
        .map(
          (a) => `
              <tr>
                <td style="padding:8px 0;">
                  <div class="text" style="font-weight:600;color:${COLORS.text};">${esc(a.name)}</div>
                  <div class="muted" style="color:${COLORS.muted};font-size:14px;">${esc(a.when)}</div>
                  ${a.address ? `<div class="muted" style="color:${COLORS.muted};font-size:14px;">${esc(a.address)}</div>` : ''}
                  ${a.travelers ? `<div class="muted" style="color:${COLORS.muted};font-size:14px;">Checking in: ${esc(a.travelers)}</div>` : ''}
                </td>
              </tr>`,
        )
        .join('')
    : `<tr><td class="muted" style="color:${COLORS.muted};font-size:14px;padding:8px 0;">No hotel booked yet.</td></tr>`;

  const flightsBlock = flights.length
    ? `
              <tr><td style="padding:12px 0 4px 0;"><div class="text" style="font-weight:600;color:${COLORS.text};font-size:15px;letter-spacing:.02em;text-transform:uppercase;">Flights</div></td></tr>
              ${flights
                .map(
                  (f) => `
              <tr>
                <td style="padding:8px 0;">
                  <div class="text" style="font-weight:600;color:${COLORS.text};">${esc(f.title)}</div>
                  <div class="muted" style="color:${COLORS.muted};font-size:14px;">${esc(f.route)}</div>
                  <div class="muted" style="color:${COLORS.muted};font-size:14px;">${esc(f.when)}</div>
                </td>
              </tr>`,
                )
                .join('')}`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="x-apple-disable-message-reformatting">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>WanderLuxe</title>
<style>
@media (prefers-color-scheme: dark) {
  body, .bg, .card { background: #1b1a19 !important; }
  .text { color: #f3f0eb !important; }
  .muted { color: #bdb6ac !important; }
  .cta { background: ${COLORS.earth600} !important; color: #ffffff !important; }
  .divider { border-color: #3b3733 !important; }
}
@media screen and (max-width: 600px) {
  .container { width: 100% !important; }
  .px { padding-left: 20px !important; padding-right: 20px !important; }
}
a { color: ${COLORS.earth600}; }
</style>
</head>
<body style="margin:0;padding:0;background:${COLORS.sand50};" class="bg">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${COLORS.sand50};">
    <tr>
      <td align="center" style="padding:24px;">
        <table role="presentation" width="600" class="container" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;">
          <tr>
            <td style="padding:24px 24px 8px 24px;text-align:center;">
              <div style="font-family: Georgia, 'Times New Roman', Times, serif;font-size:28px;letter-spacing:.5px;color:${COLORS.earth600};"><strong>WanderLuxe</strong></div>
            </td>
          </tr>
          <tr>
            <td class="card" style="background:#ffffff;border:1px solid ${COLORS.sand200};border-radius:8px;padding:0 0 8px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="px" style="padding:24px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
                    <p class="text" style="margin:0 0 12px 0;font-size:16px;line-height:1.6;color:${COLORS.text};">
                      Hi ${esc(firstName)},
                    </p>
                    <p class="text" style="margin:0 0 20px 0;font-size:16px;line-height:1.6;color:${COLORS.text};">
                      Your trip <strong>${esc(tripLabel)}</strong> starts in 3 days. Here's a quick recap of what's booked.
                    </p>
                    <div class="muted" style="color:${COLORS.muted};font-size:14px;margin-bottom:16px;">${esc(tripDates)}</div>

                    <div class="text" style="font-weight:600;color:${COLORS.text};font-size:15px;letter-spacing:.02em;text-transform:uppercase;margin-top:8px;">Where you're staying</div>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      ${hotelsSection}
                      ${flightsBlock}
                    </table>

                    <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:24px auto 8px auto;">
                      <tr>
                        <td align="center" bgcolor="${COLORS.earth600}" style="border-radius:6px;">
                          <a href="${viewUrl}" target="_blank" class="cta"
                             style="display:inline-block;padding:12px 22px;text-decoration:none;color:#ffffff;background:${COLORS.earth600};border-radius:6px;font-weight:600;">
                             View trip details
                          </a>
                        </td>
                      </tr>
                    </table>

                    <hr class="divider" style="border:none;border-top:1px solid ${COLORS.sand200};margin:16px 0;">
                    <p class="muted" style="margin:0;font-size:13px;line-height:1.6;color:${COLORS.muted};">
                      If the button doesn't work, copy and paste this link:<br>
                      <a href="${viewUrl}" target="_blank">${viewUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="text-align:center;padding:16px 24px;color:${COLORS.muted};font-size:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
              © ${new Date().getFullYear()} WanderLuxe. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function renderText(params: {
  firstName: string;
  tripLabel: string;
  tripDates: string;
  accommodations: Array<{ name: string; when: string; address: string; travelers: string }>;
  flights: Array<{ title: string; route: string; when: string }>;
  viewUrl: string;
}): string {
  const { firstName, tripLabel, tripDates, accommodations, flights, viewUrl } = params;
  const lines: string[] = [
    `Hi ${firstName},`,
    '',
    `Your trip "${tripLabel}" starts in 3 days.`,
    tripDates,
    '',
    'Where you\'re staying:',
  ];
  if (accommodations.length) {
    for (const a of accommodations) {
      lines.push(`- ${a.name}${a.when ? ` — ${a.when}` : ''}`);
      if (a.address) lines.push(`  ${a.address}`);
      if (a.travelers) lines.push(`  Checking in: ${a.travelers}`);
    }
  } else {
    lines.push('- No hotel booked yet.');
  }
  if (flights.length) {
    lines.push('', 'Flights:');
    for (const f of flights) {
      lines.push(`- ${f.title}`);
      if (f.route) lines.push(`  ${f.route}`);
      if (f.when) lines.push(`  ${f.when}`);
    }
  }
  lines.push('', `View trip details: ${viewUrl}`, '', 'Happy travels,', 'The WanderLuxe Team');
  return lines.join('\n');
}

async function sendViaMailgun(to: string, subject: string, html: string, text: string): Promise<void> {
  if (!MAILGUN_API_KEY) throw new Error('MAILGUN_API_KEY is not set');
  const form = new FormData();
  form.append('from', `WanderLuxe <no-reply@${MAILGUN_DOMAIN}>`);
  form.append('to', to);
  form.append('subject', subject);
  form.append('text', text);
  form.append('html', html);
  form.append('h:Reply-To', 'kevin@wanderluxe.io');
  form.append('o:tag', 'transactional:trip-reminder');
  form.append('o:tracking-clicks', 'no');
  const res = await fetch(`https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
    method: 'POST',
    headers: { Authorization: `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}` },
    body: form,
  });
  if (!res.ok) {
    const errTxt = await res.text();
    throw new Error(`Mailgun ${res.status}: ${errTxt}`);
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Auth: CRON_SECRET or service role.
    const authHeader = req.headers.get('Authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const token = authHeader?.replace('Bearer ', '');
    if (!token || (token !== cronSecret && token !== serviceRoleKey)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const force = url.searchParams.get('force') === '1';

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Time gate: only run when it is 20:00 in America/New_York.
    // Use Intl for DST-aware hour; avoid an extra DB round-trip.
    const etHour = Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour: 'numeric',
        hour12: false,
      }).format(new Date()),
    );
    if (!force && etHour !== 20) {
      return new Response(JSON.stringify({ skipped: true, reason: 'not 8pm ET', etHour }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // today in ET, then +3 days as the trip target arrival_date.
    const etDateParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const y = etDateParts.find((p) => p.type === 'year')!.value;
    const m = etDateParts.find((p) => p.type === 'month')!.value;
    const d = etDateParts.find((p) => p.type === 'day')!.value;
    const todayEt = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    const target = new Date(todayEt);
    target.setUTCDate(target.getUTCDate() + 3);
    const targetDate = target.toISOString().slice(0, 10);

    const { data: trips, error: tripsErr } = await supabase
      .from('trips')
      .select('trip_id, destination, primary_destination, arrival_date, departure_date')
      .eq('arrival_date', targetDate)
      .eq('hidden', false);

    if (tripsErr) throw tripsErr;

    const results: Array<{ trip_id: string; sent: number; skipped?: string; error?: string }> = [];

    for (const trip of (trips ?? []) as TripRow[]) {
      try {
        // Dedupe: atomic "claim" per (trip_id, sent_on).
        const sentOn = `${y}-${m}-${d}`;
        const { error: dupeErr, data: dupeRow } = await supabase
          .from('trip_reminder_sends')
          .insert({ trip_id: trip.trip_id, sent_on: sentOn })
          .select('trip_id')
          .maybeSingle();
        if (dupeErr) {
          // 23505 unique_violation means we already sent today.
          if ((dupeErr as { code?: string }).code === '23505') {
            results.push({ trip_id: trip.trip_id, sent: 0, skipped: 'already_sent' });
            continue;
          }
          throw dupeErr;
        }
        if (!dupeRow) {
          results.push({ trip_id: trip.trip_id, sent: 0, skipped: 'already_sent' });
          continue;
        }

        const [accomRes, flightsRes, travelersRes] = await Promise.all([
          supabase
            .from('accommodations')
            .select('stay_id, hotel, hotel_checkin_date, checkin_time, hotel_address')
            .eq('trip_id', trip.trip_id)
            .order('hotel_checkin_date', { ascending: true, nullsFirst: false }),
          supabase
            .from('transportation')
            .select('provider, confirmation_number, start_date, start_time, departure_location, arrival_location')
            .eq('trip_id', trip.trip_id)
            .eq('type', 'flight')
            .order('start_date', { ascending: true })
            .order('start_time', { ascending: true, nullsFirst: false }),
          supabase
            .from('trip_shares')
            .select('id, first_name, last_name, shared_with_user_id')
            .eq('trip_id', trip.trip_id)
            .not('shared_with_user_id', 'is', null),
        ]);
        if (accomRes.error) throw accomRes.error;
        if (flightsRes.error) throw flightsRes.error;
        if (travelersRes.error) throw travelersRes.error;

        const accommodations = (accomRes.data ?? []) as Accommodation[];
        const flights = (flightsRes.data ?? []) as Flight[];
        const travelers = (travelersRes.data ?? []) as TravelerShare[];

        // Map stay_id -> traveler names via accommodation_travelers.
        const stayIds = accommodations.map((a) => a.stay_id);
        const stayTravelers = new Map<string, string[]>();
        if (stayIds.length && travelers.length) {
          const { data: atRows, error: atErr } = await supabase
            .from('accommodation_travelers')
            .select('stay_id, traveler_id')
            .in('stay_id', stayIds);
          if (atErr) throw atErr;
          const nameById = new Map(
            travelers.map((t) => [t.id, `${t.first_name}${t.last_name ? ` ${t.last_name}` : ''}`.trim()]),
          );
          for (const row of atRows ?? []) {
            const name = nameById.get(row.traveler_id as string);
            if (!name) continue;
            const arr = stayTravelers.get(row.stay_id as string) ?? [];
            arr.push(name);
            stayTravelers.set(row.stay_id as string, arr);
          }
        }

        const accomView = accommodations.map((a) => ({
          name: a.hotel || 'Accommodation',
          when: a.hotel_checkin_date
            ? `Check-in ${formatDate(a.hotel_checkin_date)}${a.checkin_time ? ` · ${formatTime(a.checkin_time)}` : ''}`
            : '',
          address: a.hotel_address ?? '',
          travelers: (stayTravelers.get(a.stay_id) ?? []).join(', '),
        }));

        const flightView = flights.map((f) => {
          const titleParts = [f.provider, f.confirmation_number].filter(Boolean) as string[];
          return {
            title: titleParts.join(' ') || 'Flight',
            route: [f.departure_location, f.arrival_location].filter(Boolean).join(' → '),
            when: `${formatDate(f.start_date)}${f.start_time ? ` · ${formatTime(f.start_time)}` : ''}`,
          };
        });

        const tripLabel = trip.primary_destination || trip.destination;
        const tripDates = `${formatDate(trip.arrival_date)} – ${formatDate(trip.departure_date)}`;
        const viewUrl = `${DEFAULT_VIEW_URL}/trip/${trip.trip_id}`;
        const subject = `Your trip to ${tripLabel} starts in 3 days`;

        // Resolve emails for registered travelers via auth admin API.
        let sent = 0;
        const errors: string[] = [];
        for (const t of travelers) {
          if (!t.shared_with_user_id) continue;
          const { data: userRes, error: userErr } = await supabase.auth.admin.getUserById(t.shared_with_user_id);
          if (userErr || !userRes?.user?.email || !isEmail(userRes.user.email)) {
            errors.push(`no_email:${t.shared_with_user_id}`);
            continue;
          }
          const html = renderHtml({
            firstName: t.first_name,
            tripLabel,
            tripDates,
            accommodations: accomView,
            flights: flightView,
            viewUrl,
          });
          const text = renderText({
            firstName: t.first_name,
            tripLabel,
            tripDates,
            accommodations: accomView,
            flights: flightView,
            viewUrl,
          });
          try {
            await sendViaMailgun(userRes.user.email, subject, html, text);
            sent++;
          } catch (e: unknown) {
            errors.push(`mailgun:${t.shared_with_user_id}:${e instanceof Error ? e.message : 'err'}`);
          }
        }

        results.push({
          trip_id: trip.trip_id,
          sent,
          ...(errors.length ? { error: errors.join('; ') } : {}),
        });
      } catch (e: unknown) {
        console.error('trip-reminder error for trip', trip.trip_id, e);
        results.push({ trip_id: trip.trip_id, sent: 0, error: e instanceof Error ? e.message : 'error' });
      }
    }

    return new Response(
      JSON.stringify({ ok: true, targetDate, processed: results.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: unknown) {
    console.error('send-trip-reminders fatal:', err);
    return new Response(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : 'error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
