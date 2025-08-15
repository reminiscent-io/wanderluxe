
// Supabase Edge Function for sending emails with Mailgun
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// CORS headers for allowing cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Request body interface
interface EmailRequest {
  toEmail: string;
  fromEmail: string;
  tripDestination: string;
}

// Serve HTTP requests
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get Mailgun API key from environment
    const MAILGUN_API_KEY = Deno.env.get('MAILGUN_API_KEY')
    if (!MAILGUN_API_KEY) {
      throw new Error('MAILGUN_API_KEY is not set')
    }

    // Parse request body
    const requestData: EmailRequest = await req.json()
    const { toEmail, fromEmail, tripDestination } = requestData

    if (!toEmail || !fromEmail || !tripDestination) {
      throw new Error('Missing required fields: toEmail, fromEmail, or tripDestination')
    }

    // Create email content
    const emailSubject = `${fromEmail} shared a trip to ${tripDestination} with you`
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f5f0; padding: 20px; text-align: center;">
          <h1 style="color: #7c5e45; margin: 0;">WanderLuxe</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
          <p>Hello!</p>
          <p><strong>${fromEmail}</strong> has shared a trip to <strong>${tripDestination}</strong> with you on WanderLuxe.</p>
          <p>To view this trip, log in to your WanderLuxe account. If you don't have an account yet, 
          you can sign up with this email address (${toEmail}) and the trip will be available 
          in your "Shared With Me" section.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://wanderluxe.app" 
              style="background-color: #7c5e45; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              View Shared Trip
            </a>
          </div>
          <p>Happy travels!<br/>The WanderLuxe Team</p>
        </div>
        <div style="background-color: #f8f5f0; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          <p>&copy; ${new Date().getFullYear()} WanderLuxe. All rights reserved.</p>
        </div>
      </div>
    `

    const textContent = `
      Hello!
      
      ${fromEmail} has shared a trip to ${tripDestination} with you on WanderLuxe.
      
      To view this trip, log in to your WanderLuxe account. If you don't have an account yet, 
      you can sign up with this email address (${toEmail}) and the trip will be available 
      in your "Shared With Me" section.
      
      Happy travels!
      The WanderLuxe Team
    `

    // Prepare Mailgun form data
    const formData = new FormData()
    formData.append('from', 'WanderLuxe <kevin@mail.wanderluxe.io>')
    formData.append('to', toEmail)
    formData.append('subject', emailSubject)
    formData.append('text', textContent)
    formData.append('html', htmlContent)

    // Send email via Mailgun API
    const mailgunResponse = await fetch('https://api.mailgun.net/v3/mail.wanderluxe.io/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`api:${MAILGUN_API_KEY}`)}`
      },
      body: formData
    })

    if (!mailgunResponse.ok) {
      const errorText = await mailgunResponse.text()
      throw new Error(`Mailgun API error: ${mailgunResponse.status} - ${errorText}`)
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully' 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error sending email:', error)
    
    // Return error response
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message || 'Failed to send email' 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
        status: 500 
      }
    )
  }
})
