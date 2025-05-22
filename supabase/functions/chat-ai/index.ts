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

    // Verify user has access to this trip and get comprehensive trip data
    const { data: tripData, error: tripError } = await supabaseClient
      .from('trips')
      .select(`
        trip_id,
        destination,
        arrival_date,
        departure_date,
        user_id,
        cover_image_url
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

    // Get comprehensive trip data
    const [
      { data: chatHistory },
      { data: accommodations },
      { data: activities },
      { data: reservations },
      { data: transportation },
      { data: expenses },
      { data: visionBoard },
      { data: tripDays }
    ] = await Promise.all([
      // Chat history
      supabaseClient
        .from('chat_logs')
        .select('role, message')
        .eq('trip_id', tripId)
        .order('timestamp', { ascending: false })
        .limit(10),
      
      // Accommodations
      supabaseClient
        .from('accommodations')
        .select('hotel, hotel_address, initial_accommodation_day, final_accommodation_day, cost, currency')
        .eq('trip_id', tripId),
      
      // Activities
      supabaseClient
        .from('day_activities')
        .select('title, description, time, cost, currency')
        .eq('trip_id', tripId),
      
      // Restaurant reservations
      supabaseClient
        .from('reservations')
        .select('restaurant_name, cuisine_type, reservation_time, party_size, notes')
        .eq('trip_id', tripId),
      
      // Transportation
      supabaseClient
        .from('transportation')
        .select('type, departure_location, arrival_location, departure_time, arrival_time, cost, currency')
        .eq('trip_id', tripId),
      
      // Expenses/Budget
      supabaseClient
        .from('expenses')
        .select('description, cost, currency, expense_type')
        .eq('trip_id', tripId),
      
      // Vision board (user preferences)
      supabaseClient
        .from('vision_board_items')
        .select('title, description, category, image_url')
        .eq('trip_id', tripId),
      
      // Trip days structure
      supabaseClient
        .from('trip_days')
        .select('date, day_number')
        .eq('trip_id', tripId)
        .order('day_number', { ascending: true })
    ])

    // Prepare comprehensive trip context
    const tripContext = `
TRIP OVERVIEW:
- Destination: ${tripData.destination}
- Arrival Date: ${tripData.arrival_date || 'Not set'}
- Departure Date: ${tripData.departure_date || 'Not set'}
- Duration: ${tripDays?.length || 0} days

ACCOMMODATIONS:${accommodations?.length ? 
  accommodations.map(acc => `
  - ${acc.hotel} (${acc.hotel_address})
    Dates: ${acc.initial_accommodation_day} to ${acc.final_accommodation_day}
    Cost: ${acc.cost} ${acc.currency}`).join('') : '\n  - No accommodations booked yet'}

EXISTING RESTAURANT RESERVATIONS:${reservations?.length ?
  reservations.map(res => `
  - ${res.restaurant_name} (${res.cuisine_type})
    Time: ${res.reservation_time}, Party: ${res.party_size}
    ${res.notes ? `Notes: ${res.notes}` : ''}`).join('') : '\n  - No restaurant reservations yet'}

PLANNED ACTIVITIES:${activities?.length ?
  activities.map(act => `
  - ${act.title}: ${act.description}
    ${act.time ? `Time: ${act.time}` : ''}
    ${act.cost ? `Cost: ${act.cost} ${act.currency}` : ''}`).join('') : '\n  - No activities planned yet'}

TRANSPORTATION:${transportation?.length ?
  transportation.map(trans => `
  - ${trans.type}: ${trans.departure_location} → ${trans.arrival_location}
    Departure: ${trans.departure_time}, Arrival: ${trans.arrival_time}
    ${trans.cost ? `Cost: ${trans.cost} ${trans.currency}` : ''}`).join('') : '\n  - No transportation booked yet'}

BUDGET/EXPENSES:${expenses?.length ?
  expenses.map(exp => `
  - ${exp.description}: ${exp.cost} ${exp.currency} (${exp.expense_type})`).join('') : '\n  - No expenses tracked yet'}

USER INTERESTS/VISION BOARD:${visionBoard?.length ?
  visionBoard.map(vision => `
  - ${vision.title} (${vision.category}): ${vision.description}`).join('') : '\n  - No preferences specified yet'}

TRIP DAYS:${tripDays?.length ?
  tripDays.map(day => `
  - Day ${day.day_number}: ${day.date}`).join('') : '\n  - No daily structure set'}
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
            content: `You are a sophisticated travel assistant for WanderLuxe, a luxury travel planning platform. You have comprehensive knowledge of the user's trip details and should provide highly personalized recommendations.

${tripContext}

Previous conversation:
${conversationHistory}

INSTRUCTIONS:
- Use the trip details above to provide contextually relevant suggestions
- Avoid recommending restaurants where reservations already exist unless specifically asked
- Consider existing activities when suggesting new ones to avoid conflicts or redundancy
- Respect the user's vision board preferences and interests
- Be aware of their accommodation locations when suggesting nearby activities
- Consider their transportation arrangements when giving timing advice
- Reference their existing plans naturally in conversations
- Focus on luxury experiences, hidden gems, and personalized recommendations
- Provide specific, actionable advice with links when helpful
- Keep responses well-structured with headers and formatting for readability

When suggesting restaurants, activities, or experiences, consider:
1. Proximity to their existing accommodations and activities
2. Timing that works with their existing schedule
3. Their stated interests from the vision board
4. Avoiding redundancy with existing bookings
5. Complement their existing transportation and logistics`
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