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
    
    if (!keywords || typeof keywords !== 'string' || keywords.trim().length === 0) {
      throw new Error('Invalid or missing keywords')
    }

    // Clean and format the keywords
    const cleanKeywords = keywords.trim().toLowerCase()
    console.log('Original keywords:', cleanKeywords)
    
    // Construct a more specific travel-focused query
    // Add location/travel specific terms and exclude people/portraits
    const searchQuery = `${cleanKeywords} destination travel landscape scenic architecture city landmarks nature -person -people -portrait -face -model -fashion`
    console.log('Final search query:', searchQuery)
    
    const unsplashUrl = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(searchQuery)}&orientation=landscape&content_filter=high`
    console.log('Requesting URL:', unsplashUrl)

    const response = await fetch(
      unsplashUrl,
      {
        headers: {
          'Authorization': `Client-ID ${Deno.env.get('UNSPLASH_ACCESS_KEY')}`,
        },
      }
    )

    const data = await response.json()
    console.log('Unsplash response status:', response.status)
    
    if (!response.ok) {
      console.error('Unsplash API error response:', data)
      throw new Error(`Unsplash API error: ${data.errors?.[0] || 'Unknown error'}`)
    }

    // Log some info about the returned image
    console.log('Image details:', {
      description: data.description,
      alt_description: data.alt_description,
      tags: data.tags?.map((tag: any) => tag.title).join(', ')
    })

    return new Response(
      JSON.stringify({ 
        imageUrl: data.urls.regular,
        description: data.description || data.alt_description
      }),
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