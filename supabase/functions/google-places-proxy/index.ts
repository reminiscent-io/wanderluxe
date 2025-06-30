import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

// Rate limiting configuration
const RATE_LIMIT = 100 // requests per hour per user
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour in milliseconds
const rateLimitStore = new Map<string, number[]>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const userRequests = rateLimitStore.get(userId) || []
  
  // Clean old requests outside the window
  const validRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW)
  
  if (validRequests.length >= RATE_LIMIT) {
    return false
  }
  
  validRequests.push(now)
  rateLimitStore.set(userId, validRequests)
  return true
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify JWT token
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Invalid authentication token')
    }

    // Rate limiting by user ID
    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429,
        }
      )
    }

    const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')
    if (!googleApiKey) {
      throw new Error('Google Places API key not configured')
    }

    // Handle different Google Places API endpoints
    const url = new URL(req.url)
    const { searchParams } = url
    
    let googleUrl: string
    let apiParams: string

    if (req.method === 'GET') {
      // Handle autocomplete requests
      const input = searchParams.get('input')
      const types = searchParams.get('types') || 'establishment'
      const language = searchParams.get('language') || 'en'
      
      if (!input) {
        throw new Error('Missing input parameter')
      }

      apiParams = new URLSearchParams({
        input,
        types,
        language,
        key: googleApiKey,
      }).toString()

      googleUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${apiParams}`
    } else if (req.method === 'POST') {
      // Handle place details requests
      const body = await req.json()
      const { placeId } = body
      
      if (!placeId) {
        throw new Error('Missing placeId parameter')
      }

      apiParams = new URLSearchParams({
        place_id: placeId,
        fields: 'name,formatted_address,geometry,place_id,rating,website,formatted_phone_number',
        key: googleApiKey,
      }).toString()

      googleUrl = `https://maps.googleapis.com/maps/api/place/details/json?${apiParams}`
    } else {
      throw new Error('Method not allowed')
    }

    // Make request to Google Places API
    const googleResponse = await fetch(googleUrl)
    const googleData = await googleResponse.json()

    if (!googleResponse.ok) {
      throw new Error(`Google API error: ${googleData.error_message || 'Unknown error'}`)
    }

    return new Response(
      JSON.stringify(googleData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Google Places proxy error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})