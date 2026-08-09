// deno-lint-ignore-file no-explicit-any
// /supabase/functions/send-email/index.ts
// WanderLuxe — Share Trip Email via Mailgun (Supabase Edge Function)
const DEFAULT_VIEW_URL = "https://wanderluxe.io";
// Minimal CORS (tighten the origin if you want an allowlist)
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://wanderluxe.io';
const ALLOWED_ORIGIN_PATTERNS = [/\.replit\.dev(:\d+)?$/, /\.repl\.co(:\d+)?$/, /\.replit\.app(:\d+)?$/];
function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin = (origin && ALLOWED_ORIGIN_PATTERNS.some(p => p.test(origin))) ? origin : ALLOWED_ORIGIN;
  return { 'Access-Control-Allow-Origin': allowOrigin, 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS' };
}
const MAILGUN_API_KEY = Deno.env.get("MAILGUN_API_KEY");
const MAILGUN_DOMAIN = Deno.env.get("MAILGUN_DOMAIN") || "mail.wanderluxe.io";
if (!MAILGUN_API_KEY) throw new Error("MAILGUN_API_KEY is not set");

// Brand palette approximations for emails
const COLORS = {
  sand50: "#f8f5f0",
  sand100: "#f3efe8",
  sand200: "#e9e3da",
  earth600: "#7c5e45",
  text: "#2a2521",
  muted: "#6b655f",
};

const FONT_SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
const FONT_SERIF = "Georgia,'Times New Roman',Times,serif";

// tiny helpers
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && !/[\r\n]/.test(s);
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[m]!));

// Subject/preheader are plain text — HTML-escaping them would leak "&amp;" into the inbox.
const stripNewlines = (s: string) => s.replace(/[\r\n]+/g, " ").trim();

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseISODate(iso: string): { y: number; m: number; d: number } | null {
  const [y, m, d] = (iso || "").split("-").map(Number);
  if (!y || !m || !d || m < 1 || m > 12) return null;
  return { y, m, d };
}

/** "Aug 15–22, 2026" · "Aug 28 – Sep 3, 2026" · "Dec 28, 2026 – Jan 3, 2027" */
function formatDateRange(startIso: string, endIso: string): string {
  const a = parseISODate(startIso);
  const b = parseISODate(endIso);
  if (!a && !b) return "";
  if (!a || !b) {
    const o = (a ?? b)!;
    return `${MONTHS[o.m - 1]} ${o.d}, ${o.y}`;
  }
  if (a.y === b.y && a.m === b.m) return `${MONTHS[a.m - 1]} ${a.d}–${b.d}, ${a.y}`;
  if (a.y === b.y) return `${MONTHS[a.m - 1]} ${a.d} – ${MONTHS[b.m - 1]} ${b.d}, ${a.y}`;
  return `${MONTHS[a.m - 1]} ${a.d}, ${a.y} – ${MONTHS[b.m - 1]} ${b.d}, ${b.y}`;
}

function nightsBetween(startIso: string, endIso: string): number | null {
  const a = parseISODate(startIso);
  const b = parseISODate(endIso);
  if (!a || !b) return null;
  const ms = Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d);
  const nights = Math.round(ms / 86400000);
  return nights > 0 ? nights : null;
}

/**
 * Places from Google often arrive as "6181 Elmau, Austria" — drop a leading
 * postal code so the email reads like a destination, not an address label.
 */
function tidyPlace(place: string): string {
  return place.replace(/^\s*\d{3,6}\s+(?=\p{L})/u, "").trim();
}

/** Only https images are embedded; Unsplash URLs get a fixed banner crop. */
function safeImageUrl(raw: string): string | null {
  if (!raw) return null;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  if (u.hostname === "images.unsplash.com") {
    u.searchParams.set("w", "1200");
    u.searchParams.set("h", "500");
    u.searchParams.set("fit", "crop");
    u.searchParams.set("crop", "entropy");
    u.searchParams.set("q", "75");
    u.searchParams.set("auto", "format");
  }
  return u.toString();
}

type EmailView = {
  toEmail: string;
  sharerLabel: string;      // display name when we have one, else the email
  sharerEmail: string;
  tripName: string;
  place: string;            // "" when absent or same as the trip name
  dateRange: string;        // "" when dates are missing
  nights: number | null;
  canEdit: boolean;
  coverImageUrl: string | null;
  viewUrl: string;
};

function renderHtml(v: EmailView): string {
  const accessLabel = v.canEdit ? "Can edit" : "View only";
  const inviteLine = v.canEdit
    ? `<strong>${esc(v.sharerLabel)}</strong> invited you to view and help plan this trip.`
    : `<strong>${esc(v.sharerLabel)}</strong> invited you to follow along with this trip.`;

  const metaBits = [
    v.place ? esc(v.place) : "",
    v.dateRange ? esc(v.dateRange) : "",
    v.nights ? `${v.nights} ${v.nights === 1 ? "night" : "nights"}` : "",
  ].filter(Boolean);

  const preheader = stripNewlines(
    [
      `${v.sharerLabel} shared "${v.tripName}"`,
      [v.place, v.dateRange].filter(Boolean).join(" · "),
    ].filter(Boolean).join(" — "),
  );

  const coverBlock = v.coverImageUrl
    ? `
                <tr>
                  <td style="padding:0;line-height:0;font-size:0;">
                    <img src="${esc(v.coverImageUrl)}" width="600" alt=""
                         style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;text-decoration:none;border-radius:12px 12px 0 0;">
                  </td>
                </tr>`
    : "";

  const metaBlock = metaBits.length
    ? `
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
                      <tr>
                        <td class="meta" style="background:${COLORS.sand100};border-radius:8px;padding:12px 16px;font-family:${FONT_SANS};font-size:14px;line-height:1.5;color:${COLORS.muted};">
                          ${metaBits.join(' <span style="color:#c9c0b4;">·</span> ')}
                        </td>
                      </tr>
                    </table>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="x-apple-disable-message-reformatting">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<!-- Stop iOS/Outlook from auto-linking the addresses below in default blue. -->
<meta name="format-detection" content="telephone=no,date=no,address=no,email=no">
<title>${esc(v.tripName)} · WanderLuxe</title>
<style>
:root { color-scheme: light dark; supported-color-schemes: light dark; }
@media (prefers-color-scheme: dark) {
  body, .bg { background: #141312 !important; }
  .card { background: #1f1d1b !important; border-color: #332f2b !important; }
  .meta { background: #262321 !important; color: #bdb6ac !important; }
  .text { color: #f3f0eb !important; }
  .heading { color: #f7f4ef !important; }
  .muted, .footer { color: #a9a29a !important; }
  .eyebrow, .wordmark { color: #c2a184 !important; }
  .pill { background: #2f2a26 !important; color: #d8cec2 !important; border-color: #433c35 !important; }
  .cta { background: #8a6a4e !important; color: #ffffff !important; }
  .divider { border-color: #332f2b !important; }
  a.link { color: #c2a184 !important; }
}
@media screen and (max-width: 600px) {
  .container { width: 100% !important; }
  .px { padding-left: 22px !important; padding-right: 22px !important; }
  .heading { font-size: 26px !important; }
}
a.link { color: ${COLORS.earth600}; }
/* Addresses shown as plain text, not tappable mailto links. */
.noline, .noline a { color: inherit !important; text-decoration: none !important; }
</style>
</head>
<body style="margin:0;padding:0;background:${COLORS.sand50};" class="bg">
  <div style="display:none;font-size:1px;color:${COLORS.sand50};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${esc(preheader)}</div>
  <div style="display:none;max-height:0;overflow:hidden;">&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" class="bg" style="background:${COLORS.sand50};">
    <tr>
      <td align="center" class="bg" style="padding:24px;background:${COLORS.sand50};">
        <table role="presentation" width="600" class="container" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;">
          <tr>
            <td style="padding:8px 24px 20px 24px;text-align:center;">
              <div class="wordmark" style="font-family:${FONT_SERIF};font-size:26px;letter-spacing:.5px;color:${COLORS.earth600};"><strong>WanderLuxe</strong></div>
            </td>
          </tr>
          <tr>
            <td class="card" style="background:#ffffff;border:1px solid ${COLORS.sand200};border-radius:12px;overflow:hidden;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${coverBlock}
                <tr>
                  <td class="px" style="padding:28px 32px 32px 32px;font-family:${FONT_SANS};">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 10px 0;">
                      <tr>
                        <td class="eyebrow" style="font-family:${FONT_SANS};font-size:12px;font-weight:700;letter-spacing:.10em;text-transform:uppercase;color:${COLORS.earth600};padding-right:10px;">
                          Shared with you
                        </td>
                        <td class="pill" style="font-family:${FONT_SANS};font-size:11px;font-weight:600;letter-spacing:.04em;color:${COLORS.muted};background:${COLORS.sand100};border:1px solid ${COLORS.sand200};border-radius:999px;padding:3px 10px;white-space:nowrap;">
                          ${accessLabel}
                        </td>
                      </tr>
                    </table>

                    <h1 class="heading" style="margin:0 0 6px 0;font-family:${FONT_SERIF};font-size:30px;line-height:1.2;font-weight:normal;color:${COLORS.text};">
                      ${esc(v.tripName)}
                    </h1>

                    ${metaBlock}

                    <p class="text" style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:${COLORS.text};">
                      ${inviteLine}
                    </p>

                    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px 0;">
                      <tr>
                        <td align="center" bgcolor="${COLORS.earth600}" style="border-radius:8px;">
                          <a href="${esc(v.viewUrl)}" target="_blank" class="cta"
                             style="font-family:${FONT_SANS};display:inline-block;padding:15px 30px;text-decoration:none;color:#ffffff;background:${COLORS.earth600};border-radius:8px;font-weight:600;font-size:16px;line-height:1;">
                             View the itinerary
                          </a>
                        </td>
                      </tr>
                    </table>

                    <hr class="divider" style="border:none;border-top:1px solid ${COLORS.sand200};margin:0 0 16px 0;">

                    <p class="muted" style="margin:0 0 10px 0;font-size:13px;line-height:1.6;color:${COLORS.muted};">
                      Sign in with <span class="noline" style="font-weight:600;color:${COLORS.muted};">${esc(v.toEmail)}</span> to open it. No account yet? Sign up with that address and the trip will be waiting in <em>Shared With Me</em>.
                    </p>
                    <p class="muted" style="margin:0;font-size:13px;line-height:1.6;color:${COLORS.muted};">
                      Button not working? <a class="link" href="${esc(v.viewUrl)}" target="_blank">Open your trip</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="footer" style="text-align:center;padding:20px 24px;color:${COLORS.muted};font-size:12px;line-height:1.6;font-family:${FONT_SANS};">
              You received this because <span class="noline" style="color:${COLORS.muted};">${esc(v.sharerEmail)}</span> shared a trip with you on WanderLuxe.<br>
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

function renderText(v: EmailView): string {
  const metaBits = [v.place, v.dateRange, v.nights ? `${v.nights} ${v.nights === 1 ? "night" : "nights"}` : ""].filter(Boolean);
  return [
    `${v.sharerLabel} shared a trip with you on WanderLuxe.`,
    ``,
    v.tripName,
    ...(metaBits.length ? [metaBits.join(" · ")] : []),
    `Access: ${v.canEdit ? "Can edit" : "View only"}`,
    ``,
    v.canEdit
      ? `${v.sharerLabel} invited you to view and help plan this trip.`
      : `${v.sharerLabel} invited you to follow along with this trip.`,
    ``,
    `View the itinerary: ${v.viewUrl}`,
    ``,
    `Sign in with ${v.toEmail} to open it. No account yet? Sign up with that address and the trip will be waiting in "Shared With Me".`,
    ``,
    `Happy travels,`,
    `The WanderLuxe Team`,
  ].join("\n");
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === "OPTIONS") return new Response(null, {
    headers: corsHeaders
  });
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({
        success: false,
        message: "Method not allowed"
      }), {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const body = await req.json();
    const toEmail = (body.toEmail ?? "").trim();
    const fromEmail = (body.fromEmail ?? "").trim();
    const tripDestination = (body.tripDestination ?? "").trim();
    const tripName = (body.tripName ?? tripDestination).trim();
    const tripId = (body.tripId ?? "").trim();
    // Optional enrichment — the email degrades gracefully without any of it.
    const sharerName = stripNewlines((body.sharedByName ?? "").toString()).slice(0, 80);
    const arrivalDate = (body.arrivalDate ?? "").toString().trim();
    const departureDate = (body.departureDate ?? "").toString().trim();
    const coverImageUrl = safeImageUrl((body.coverImageUrl ?? "").toString().trim());
    const canEdit = body.permissionLevel !== "read";

    if (!isEmail(toEmail) || !isEmail(fromEmail) || !tripDestination) {
      throw new Error("Missing or invalid fields: toEmail, fromEmail, or tripDestination");
    }

    // Build the view URL - include tripId if provided for direct navigation
    const viewUrl = tripId
      ? `${DEFAULT_VIEW_URL}/trip/${encodeURIComponent(tripId)}`
      : DEFAULT_VIEW_URL;

    // The trip name and the place are frequently the same string ("Gregg in
    // Austria"); only show the place when it adds something.
    const place = tidyPlace(tripDestination);
    const showPlace = place && place.toLowerCase() !== tripName.toLowerCase() ? place : "";

    const view: EmailView = {
      toEmail,
      sharerLabel: sharerName || fromEmail,
      sharerEmail: fromEmail,
      tripName,
      place: showPlace,
      dateRange: formatDateRange(arrivalDate, departureDate),
      nights: nightsBetween(arrivalDate, departureDate),
      canEdit,
      coverImageUrl,
      viewUrl,
    };

    // Subject is plain text — do not HTML-escape it.
    const emailSubject = stripNewlines(`${view.sharerLabel} shared “${tripName}” with you`);
    const htmlContent = renderHtml(view);
    const textContent = renderText(view);

    // Build Mailgun form-data
    const formData = new FormData();
    // Keep From aligned with Mailgun domain for SPF/DKIM
    formData.append("from", `WanderLuxe <no-reply@${MAILGUN_DOMAIN}>`);
    formData.append("to", toEmail);
    formData.append("subject", emailSubject);
    formData.append("text", textContent);
    formData.append("html", htmlContent);
    // Always route replies to Kevin
    formData.append("h:Reply-To", "kevin@wanderluxe.io");
    // Optional: tagging / click tracking
    formData.append("o:tag", "transactional:share-trip");
    formData.append("o:tracking-clicks", "no");
    const mgRes = await fetch(`https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`
      },
      body: formData
    });
    if (!mgRes.ok) {
      const errTxt = await mgRes.text();
      throw new Error(`Mailgun API error: ${mgRes.status} – ${errTxt}`);
    }
    return new Response(JSON.stringify({
      success: true,
      message: "Email sent"
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (err: any) {
    console.error("send-share-trip-email error:", err);
    return new Response(JSON.stringify({
      success: false,
      message: err?.message ?? "Failed to send email"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
