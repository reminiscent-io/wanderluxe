import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import * as SendGrid from 'https://esm.sh/@sendgrid/mail@7.7.0'
import { corsHeaders } from '../_shared/cors.ts'

interface RequestBody {
  recipientEmail: string
  tripDestination: string
  sharedByEmail: string
}

serve(async (req) => {
  /* ----- 1. CORS pre-flight ----- */
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  /* ----- 2. Environment ----- */
  const SUPABASE_URL   = Deno.env.get('SUPABASE_URL')   ?? ''
  const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY') ?? ''

  if (!SENDGRID_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'Email service not configured' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    )
  }

  /* ----- 3. Parse body ----- */
  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    )
  }

  const { recipientEmail, tripDestination, sharedByEmail } = body
  if (!recipientEmail || !tripDestination || !sharedByEmail) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
    )
  }

  /* ----- 4. Send email via SendGrid ----- */
  try {
    SendGrid.setApiKey(SENDGRID_API_KEY)

    const msg = {
      to:   recipientEmail,
      from: 'noreply@yourtravelapp.com',               // verified sender
      subject: `Trip to ${tripDestination} has been shared with you`,
      text:  `${sharedByEmail} has shared their trip to ${tripDestination} with you.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>A Trip Has Been Shared With You</h2>
          <p><strong>${sharedByEmail}</strong> has shared their trip to
             <strong>${tripDestination}</strong> with you.</p>
          <p>Sign in to view and collaborate on planning this exciting trip!</p>
          <div style="margin: 25px 0;">
            <a href="${SUPABASE_URL}"
               style="background:#4a6855;color:#fff;padding:10px 20px;
                      text-decoration:none;border-radius:4px;display:inline-block;">
              View Trip
            </a>
          </div>
          <p style="color:#666;font-size:14px;">
            If you don't have an account, sign up with this email to access the trip.
          </p>
        </div>
      `,
    }

    await SendGrid.send(msg)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (error) {
    console.error('SendGrid error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to send email' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    )
  }
})
