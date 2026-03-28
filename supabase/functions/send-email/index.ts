// deno-lint-ignore-file no-explicit-any
// /supabase/functions/send-share-trip-email/index.ts
// WanderLuxe — Share Trip Email via Mailgun (Supabase Edge Function)
const DEFAULT_VIEW_URL = "https://wanderluxe.io";
// Minimal CORS (tighten the origin if you want an allowlist)
import { getCorsHeaders } from '../_shared/cors.ts';
const MAILGUN_API_KEY = Deno.env.get("MAILGUN_API_KEY");
const MAILGUN_DOMAIN = Deno.env.get("MAILGUN_DOMAIN") || "mail.wanderluxe.io";
if (!MAILGUN_API_KEY) throw new Error("MAILGUN_API_KEY is not set");
// tiny helpers
const isEmail = (s)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && !/[\r\n]/.test(s);
const esc = (s)=>s.replace(/[&<>"']/g, (m)=>({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[m]);
Deno.serve(async (req)=>{
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
    if (!isEmail(toEmail) || !isEmail(fromEmail) || !tripDestination) {
      throw new Error("Missing or invalid fields: toEmail, fromEmail, or tripDestination");
    }
    // Build the view URL - include tripId if provided for direct navigation
    const viewUrl = tripId
      ? `${DEFAULT_VIEW_URL}/trip/${tripId}`
      : DEFAULT_VIEW_URL;
    // Brand palette approximations for emails
    const colors = {
      sand50: "#f8f5f0",
      sand200: "#e9e3da",
      earth600: "#7c5e45",
      text: "#2a2521"
    };
    const emailSubject = `${esc(fromEmail)} shared “${esc(tripName)}” with you on WanderLuxe`;
    const htmlContent = `<!doctype html>
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
  .cta { background: ${colors.earth600} !important; color: #ffffff !important; }
  .divider { border-color: #3b3733 !important; }
}
@media screen and (max-width: 600px) {
  .container { width: 100% !important; }
  .px { padding-left: 20px !important; padding-right: 20px !important; }
}
a { color: ${colors.earth600}; }
</style>
</head>
<body style="margin:0;padding:0;background:${colors.sand50};" class="bg">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${colors.sand50};">
    <tr>
      <td align="center" style="padding:24px;">
        <table role="presentation" width="600" class="container" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;">
          <tr>
            <td style="padding:24px 24px 8px 24px;text-align:center;">
              <div style="font-family: Georgia, 'Times New Roman', Times, serif;font-size:28px;letter-spacing:.5px;color:${colors.earth600};"><strong>WanderLuxe</strong></div>
            </td>
          </tr>
          <tr>
            <td class="card" style="background:#ffffff;border:1px solid ${colors.sand200};border-radius:8px;padding:0 0 8px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td class="px" style="padding:24px 32px;">
                    <p class="text" style="margin:0 0 12px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:16px;line-height:1.6;color:${colors.text};">
                      Hello!
                    </p>
                    <p class="text" style="margin:0 0 12px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:16px;line-height:1.6;color:${colors.text};">
                      <strong>${esc(fromEmail)}</strong> has shared a trip with you on WanderLuxe:
                      <strong>“${esc(tripName)}”</strong> (${esc(tripDestination)}).
                    </p>
                    <p class="text" style="margin:0 0 24px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:16px;line-height:1.6;color:${colors.text};">
                      To view this trip, sign in to your WanderLuxe account. If you don’t have one,
                      create it using <strong>${esc(toEmail)}</strong> and it will appear in <em>Shared With Me</em>.
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:8px auto 24px auto;">
                      <tr>
                        <td align="center" bgcolor="${colors.earth600}" style="border-radius:6px;">
                          <a href="${viewUrl}" target="_blank"
                             class="cta"
                             style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;display:inline-block;padding:12px 22px;text-decoration:none;color:#ffffff;background:${colors.earth600};border-radius:6px;font-weight:600;">
                             View Shared Trip
                          </a>
                        </td>
                      </tr>
                    </table>
                    <hr class="divider" style="border:none;border-top:1px solid ${colors.sand200};margin:8px 0 16px 0;">
                    <p class="muted" style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;font-size:13px;line-height:1.6;color:#6b655f;">
                      If the button doesn't work, copy and paste this link:<br>
                      <a href="${viewUrl}" target="_blank">${viewUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="text-align:center;padding:16px 24px;color:#6b655f;font-size:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
              © ${new Date().getFullYear()} WanderLuxe. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
    const textContent = [
      `Hello!`,
      ``,
      `${fromEmail} shared a trip with you on WanderLuxe: "${tripName}" (${tripDestination}).`,
      ``,
      `To view this trip, sign in to your WanderLuxe account. If you don't have one, create it using ${toEmail} and it will appear in "Shared With Me".`,
      ``,
      `Open: ${viewUrl}`,
      ``,
      `Happy travels,`,
      `The WanderLuxe Team`
    ].join("\n");
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
  } catch (err) {
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
