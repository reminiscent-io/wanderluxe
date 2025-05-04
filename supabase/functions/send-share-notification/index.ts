// Follow this setup guide to integrate the Deno runtime into your project:
// https://deno.land/manual/examples/deploy_supabase_edge

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import * as SendGrid from 'https://esm.sh/@sendgrid/mail@7.7.0'

type RequestBody = {
  recipientEmail: string
  tripDestination: string
  sharedByEmail: string
}

serve(async (req) => {
  // Get environment variables
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || ''
  const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY') || ''
  
  if (!SENDGRID_API_KEY) {
    console.error('SENDGRID_API_KEY is not set')
    return new Response(
      JSON.stringify({ error: 'Email service not configured' }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    )
  }

  // Create Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  
  // Verify JWT for authenticated function calls
  const { error: authError } = await supabase.auth.getUser()
  if (authError) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { headers: { 'Content-Type': 'application/json' }, status: 401 }
    )
  }

  // Parse request body
  let body: RequestBody
  try {
    body = await req.json()
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Invalid request body' }),
      { headers: { 'Content-Type': 'application/json' }, status: 400 }
    )
  }

  const { recipientEmail, tripDestination, sharedByEmail } = body

  if (!recipientEmail || !tripDestination || !sharedByEmail) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields' }),
      { headers: { 'Content-Type': 'application/json' }, status: 400 }
    )
  }

  // Setup SendGrid
  SendGrid.setApiKey(SENDGRID_API_KEY)

  try {
    // Prepare email
    const msg = {
      to: recipientEmail,
      from: 'noreply@yourtravelapp.com', // Use your verified sender from SendGrid
      subject: `Trip to ${tripDestination} has been shared with you`,
      text: `${sharedByEmail} has shared their trip to ${tripDestination} with you. Sign in to view and collaborate on this trip.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>A Trip Has Been Shared With You</h2>
          <p><strong>${sharedByEmail}</strong> has shared their trip to <strong>${tripDestination}</strong> with you.</p>
          <p>Sign in to view and collaborate on planning this exciting trip!</p>
          <div style="margin: 25px 0;">
            <a href="${SUPABASE_URL}" style="background-color: #4a6855; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
              View Trip
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">If you don't have an account yet, you can sign up with this email address to access the shared trip.</p>
        </div>
      `,
    }

    // Send email
    await SendGrid.send(msg)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    console.error('SendGrid error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to send email' }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})