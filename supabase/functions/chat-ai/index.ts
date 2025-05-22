import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get user from JWT
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Parse request body
    const { message, tripId } = await req.json()

    if (!message || !tripId) {
      throw new Error('Message and tripId are required')
    }

    // Verify user has access to this trip
    const { data: tripData, error: tripError } = await supabaseClient
      .from('trips')
      .select(`
        trip_id,
        destination,
        arrival_date,
        departure_date,
        user_id
      `)
      .eq('trip_id', tripId)
      .single()

    if (tripError || !tripData) {
      throw new Error('Trip not found or access denied')
    }

    // Check if user owns trip or has shared access
    const hasAccess = tripData.user_id === user.id

    if (!hasAccess) {
      const { data: shareData } = await supabaseClient
        .from('trip_shares')
        .select('id')
        .eq('trip_id', tripId)
        .eq('shared_by_user_id', user.id)
        .single()

      if (!shareData) {
        throw new Error('Access denied to this trip')
      }
    }

    // Get recent chat history for context
    const { data: chatHistory } = await supabaseClient
      .from('chat_logs')
      .select('role, message')
      .eq('trip_id', tripId)
      .order('timestamp', { ascending: false })
      .limit(10)

    // Prepare context about the trip
    const tripContext = `
Trip Details:
- Destination: ${tripData.destination}
- Arrival Date: ${tripData.arrival_date || 'Not set'}
- Departure Date: ${tripData.departure_date || 'Not set'}
`

    // Prepare chat history for context
    const conversationHistory = chatHistory
      ?.reverse()
      .map(msg => `${msg.role}: ${msg.message}`)
      .join('\n') || ''

    // Call Perplexity API
    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('PERPLEXITY_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: `You are a helpful travel assistant for WanderLuxe, a luxury travel planning platform. Help users plan their trip with personalized suggestions for activities, dining, accommodations, and local insights.

${tripContext}

Previous conversation:
${conversationHistory}

Provide helpful, specific, and actionable advice. Focus on luxury experiences, hidden gems, and personalized recommendations based on the trip details. Keep responses concise but informative.`
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
        top_p: 0.9,
        stream: false
      })
    })

    if (!perplexityResponse.ok) {
      throw new Error(`Perplexity API error: ${perplexityResponse.statusText}`)
    }

    const aiResponseData = await perplexityResponse.json()
    const aiMessage = aiResponseData.choices[0]?.message?.content || 'Sorry, I couldn\'t generate a response. Please try again.'

    // Store user message in database
    const userMessageId = crypto.randomUUID()
    const { error: userInsertError } = await supabaseClient
      .from('chat_logs')
      .insert({
        id: userMessageId,
        trip_id: tripId,
        user_id: user.id,
        role: 'user',
        message: message,
        timestamp: new Date().toISOString()
      })

    if (userInsertError) {
      console.error('Error inserting user message:', userInsertError)
    }

    // Store AI response in database
    const aiMessageId = crypto.randomUUID()
    const { error: aiInsertError } = await supabaseClient
      .from('chat_logs')
      .insert({
        id: aiMessageId,
        trip_id: tripId,
        user_id: user.id, // We can track which user triggered the AI response
        role: 'ai',
        message: aiMessage,
        timestamp: new Date().toISOString()
      })

    if (aiInsertError) {
      console.error('Error inserting AI message:', aiInsertError)
    }

    // Return the messages
    return new Response(
      JSON.stringify({
        success: true,
        userMessage: {
          id: userMessageId,
          role: 'user',
          message: message,
          timestamp: new Date().toISOString(),
          user_id: user.id
        },
        aiMessage: {
          id: aiMessageId,
          role: 'ai',
          message: aiMessage,
          timestamp: new Date().toISOString()
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in chat-ai function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})