
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OpenGraphData {
  ogImage?: string;
  title?: string;
  description?: string;
}

async function fetchOpenGraphData(url: string): Promise<OpenGraphData> {
  try {
    const response = await fetch(url);
    const html = await response.text();
    
    // Create a simple parser for meta tags
    const getMetaContent = (property: string) => {
      const match = html.match(new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, 'i'));
      return match ? match[1] : null;
    };

    return {
      ogImage: getMetaContent('og:image'),
      title: getMetaContent('og:title'),
      description: getMetaContent('og:description'),
    };
  } catch (error) {
    console.error('Error fetching OpenGraph data:', error);
    return {};
  }
}

async function fetchGooglePlacesImage(url: string): Promise<string | null> {
  try {
    const domain = new URL(url).hostname;
    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    
    if (!apiKey) {
      throw new Error('Google Places API key not configured');
    }

    // First, search for the place
    const searchResponse = await fetch(
      `https://places.googleapis.com/v1/places:searchText`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.photos'
        },
        body: JSON.stringify({
          textQuery: domain
        })
      }
    );

    const searchData = await searchResponse.json();
    
    if (searchData.places?.[0]?.photos?.[0]?.name) {
      // Get the photo
      const photoResponse = await fetch(
        `https://places.googleapis.com/v1/places/photos/${searchData.places[0].photos[0].name}/media`,
        {
          headers: {
            'X-Goog-Api-Key': apiKey
          }
        }
      );

      if (photoResponse.ok) {
        return photoResponse.url;
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching Google Places image:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { url } = await req.json()

    if (!url) {
      throw new Error('URL is required')
    }

    // Try OpenGraph first
    const ogData = await fetchOpenGraphData(url);
    
    let imageUrl = ogData.ogImage;

    // If no OpenGraph image, try Google Places
    if (!imageUrl) {
      imageUrl = await fetchGooglePlacesImage(url);
    }

    return new Response(
      JSON.stringify({
        image_url: imageUrl,
        title: ogData.title,
        description: ogData.description
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
