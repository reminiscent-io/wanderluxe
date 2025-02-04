import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { keywords } = await req.json()
    
    // Combine the user's keywords with travel-related terms and content filters
    const searchQuery = `${keywords} travel destination landscape scenic -person -people -portrait`
    
    const response = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(searchQuery)}&orientation=landscape&content_filter=high`,
      {
        headers: {
          'Authorization': `Client-ID ${Deno.env.get('UNSPLASH_ACCESS_KEY')}`,
        },
      }
    )

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(`Unsplash API error: ${data.errors?.[0] || 'Unknown error'}`)
    }

    return new Response(
      JSON.stringify({ imageUrl: data.urls.regular }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error generating image:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})