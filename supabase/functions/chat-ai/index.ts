import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Compiled luxury hotel regex for better performance
const luxuryHotelRegex = new RegExp(
  ['Ritz', 'Four Seasons', 'St\\.? Regis', 'Mandarin Oriental', 'Park Hyatt', 
   'Edition', 'Bulgari', 'Aman', 'Rosewood', 'Peninsula'].join('|'), 
  'i'
)

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

    // Parse and validate request body
    let body
    try {
      body = await req.json()
    } catch {
      throw new Error('Invalid JSON in request body')
    }

    const { message, tripId } = body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw new Error('Message is required and must be a non-empty string')
    }

    if (!tripId || typeof tripId !== 'string') {
      throw new Error('TripId is required and must be a string')
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

    // Determine hotel type and location context
    const primaryHotel = accommodations?.[0]
    let locationContext = tripData.destination
    let budgetLevel = 'mid-range'
    
    if (primaryHotel) {
      locationContext = primaryHotel.hotel_address || tripData.destination
      // Determine budget level from hotel cost
      if (primaryHotel.cost && primaryHotel.final_accommodation_day && primaryHotel.initial_accommodation_day) {
        const startDate = new Date(primaryHotel.initial_accommodation_day)
        const endDate = new Date(primaryHotel.final_accommodation_day)
        const timeDiff = endDate.getTime() - startDate.getTime()
        const daysDiff = Math.max(1, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)))
        const dailyCost = primaryHotel.cost / daysDiff
        
        if (dailyCost > 400) budgetLevel = 'luxury'
        else if (dailyCost > 200) budgetLevel = 'upscale'
        else if (dailyCost < 100) budgetLevel = 'budget-conscious'
      }
      
      // Detect luxury hotel names/brands using compiled regex
      if (luxuryHotelRegex.test(primaryHotel.hotel)) {
        budgetLevel = 'luxury'
      }
    }

    // Prepare comprehensive trip context
    const tripContext = `
TRIP OVERVIEW:
- Trip Title/Theme: ${tripData.destination}
- Primary Location: ${locationContext}
- Arrival Date: ${tripData.arrival_date || 'Not set'}
- Departure Date: ${tripData.departure_date || 'Not set'}
- Duration: ${tripDays?.length || 0} days
- Budget Level: ${budgetLevel}

PRIMARY ACCOMMODATION:${primaryHotel ? `
- Hotel: ${primaryHotel.hotel}
- Location: ${primaryHotel.hotel_address}
- Dates: ${primaryHotel.initial_accommodation_day} to ${primaryHotel.final_accommodation_day}
- Cost: ${primaryHotel.cost} ${primaryHotel.currency}
- Budget Category: ${budgetLevel}` : '\n- No primary accommodation set'}

OTHER ACCOMMODATIONS:${accommodations?.length > 1 ? 
  accommodations.slice(1).map(acc => `
  - ${acc.hotel} (${acc.hotel_address})
    Dates: ${acc.initial_accommodation_day} to ${acc.final_accommodation_day}
    Cost: ${acc.cost} ${acc.currency}`).join('') : '\n  - None'}

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
            content: `You are a sophisticated travel assistant for WanderLuxe, a luxury travel planning platform. You ONLY assist with travel-related topics and should provide highly personalized recommendations.

SCOPE - You can help with:
- Trip planning, itineraries, and scheduling
- Activities, attractions, and experiences
- Restaurants, dining, and food recommendations
- Transportation (flights, trains, cars, local transit)
- Accommodations and hotels
- Weather and climate information
- Packing and clothing recommendations for destinations
- Local customs, culture, and etiquette
- Currency, tipping, and travel costs
- Safety tips and travel advisories
- Visa requirements and travel documents
- Language basics and communication tips
- Shopping and local markets
- Entertainment and nightlife
- Day trips and excursions
- Travel insurance and health considerations
- Time zones and jet lag management
- Photography spots and travel memories
- Travel apps and tools
- Luggage and travel gear recommendations
- Questions about their current trip bookings, reservations, or plans

IMPORTANT: If a user asks about topics unrelated to travel (such as general knowledge, personal advice, work matters, health issues not related to travel, politics, etc.), politely respond: "I'm your travel assistant and can only help with travel-related questions about your trip. Is there anything about your travel plans I can assist you with?"

You have comprehensive knowledge of the user's trip details and should provide highly personalized recommendations.

${tripContext}

Previous conversation:
${conversationHistory}

INSTRUCTIONS:
- Use hotel location as your PRIMARY geographic anchor, not the trip title/theme
- Match recommendations to the budget level indicated by their accommodation choices
- If budget level is 'luxury': Focus on high-end, exclusive experiences, fine dining, private tours
- If budget level is 'budget-conscious': Emphasize value, free activities, affordable dining options
- If budget level is 'upscale' or 'mid-range': Balance quality with reasonable pricing
- Be conversational and engaging - ask follow-up questions when you need more context
- When unsure about preferences, timing, or specifics, ask clarifying questions
- Use the hotel address/location to suggest nearby activities and restaurants
- Avoid recommending places where they already have reservations
- Reference their existing plans naturally in conversations
- Be enthusiastic and encouraging about their trip plans
- Provide specific, actionable advice with links when helpful
- Keep responses well-structured with headers and formatting for readability

ENGAGEMENT GUIDELINES:
- If a request is vague, ask 1-2 specific questions to better help them
- Examples: "What type of cuisine are you in the mood for?" or "Are you looking for morning or evening activities?"
- Show enthusiasm: "That sounds amazing!" or "Great choice with [hotel name]!"
- Reference their hotel location specifically: "Since you're staying near [area], I'd recommend..."

BUDGET-CONSCIOUS RECOMMENDATIONS:
- Luxury hotels (${budgetLevel === 'luxury' ? 'ACTIVE' : 'inactive'}): Private experiences, Michelin restaurants, exclusive access
- Budget hotels (${budgetLevel === 'budget-conscious' ? 'ACTIVE' : 'inactive'}): Free activities, local markets, affordable eats, public transport tips
- Mid/Upscale (${budgetLevel === 'upscale' || budgetLevel === 'mid-range' ? 'ACTIVE' : 'inactive'}): Quality experiences at reasonable prices

When suggesting restaurants, activities, or experiences, prioritize:
1. Proximity to their hotel location (not just destination city)
2. Budget alignment with their accommodation level
3. Timing that works with their existing schedule
4. Their stated interests from the vision board
5. Avoiding redundancy with existing bookings`
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
    
    // Determine appropriate status code based on error type
    let status = 500
    if (error.message.includes('Unauthorized')) status = 401
    if (error.message.includes('access denied') || error.message.includes('Access denied')) status = 403
    if (error.message.includes('not found') || error.message.includes('Not found')) status = 404
    if (error.message.includes('required') || error.message.includes('Invalid JSON')) status = 400
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status,
      }
    )
  }
})