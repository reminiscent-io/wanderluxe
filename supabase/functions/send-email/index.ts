// Supabase Edge Function for sending emails with SendGrid
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import * as SendGrid from 'https://esm.sh/@sendgrid/mail@7.7.0'

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
    // Get SendGrid API key from environment
    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
    if (!SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY is not set')
    }

    // Initialize SendGrid
    SendGrid.setApiKey(SENDGRID_API_KEY)

    // Parse request body
    const requestData: EmailRequest = await req.json()
    const { toEmail, fromEmail, tripDestination } = requestData

    if (!toEmail || !fromEmail || !tripDestination) {
      throw new Error('Missing required fields: toEmail, fromEmail, or tripDestination')
    }

    // Create email content
    const emailSubject = `${fromEmail} shared a trip to ${tripDestination} with you`
    const emailContent = {
      to: toEmail,
      from: {
        email: 'kevin@wanderluxe.io', // Verified sender email
        name: 'WanderLuxe',
      },
      subject: emailSubject,
      text: `
        Hello!
        
        ${fromEmail} has shared a trip to ${tripDestination} with you on WanderLuxe.
        
        To view this trip, log in to your WanderLuxe account. If you don't have an account yet, 
        you can sign up with this email address (${toEmail}) and the trip will be available 
        in your "Shared With Me" section.
        
        Happy travels!
        The WanderLuxe Team
      `,
      html: `
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
      `,
    }

    // Send the email
    await SendGrid.send(emailContent)

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