import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache responses for 1 hour to reduce API calls
const CACHE_AGE = 3600;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { keywords, count = 3 } = await req.json();
    
    // Validate input parameters
    if (!keywords?.trim() || typeof keywords !== 'string') {
      throw new Error('Please provide valid search keywords');
    }
    
    if (count > 5 || count < 1) {
      throw new Error('Image count must be between 1-5');
    }

    const cleanKeywords = keywords.trim().toLowerCase();
    const searchQuery = `${cleanKeywords} landscape travel destination -people -selfie`;
    
    // Use search endpoint instead of random for better relevance
    const unsplashUrl = new URL('https://api.unsplash.com/search/photos');
    unsplashUrl.searchParams.set('query', searchQuery);
    unsplashUrl.searchParams.set('orientation', 'landscape');
    unsplashUrl.searchParams.set('per_page', count);
    unsplashUrl.searchParams.set('content_filter', 'high');
    unsplashUrl.searchParams.set('order_by', 'relevant');

    const response = await fetch(unsplashUrl, {
      headers: {
        'Authorization': `Client-ID ${Deno.env.get('UNSPLASH_ACCESS_KEY')}`,
        'Accept-Version': 'v1'
      }
    });

    if (response.status === 404) {
      throw new Error('No images found for these keywords');
    }

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Unsplash API error: ${data.errors?.join(', ') || 'Unknown error'}`);
    }

    // Format response with multiple images
    const images = data.results.map((photo: any) => ({
      id: photo.id,
      url: photo.urls.regular,
      description: photo.description || photo.alt_description,
      photographer: photo.user.name,
      downloadLocation: photo.links.download_location
    }));

    return new Response(JSON.stringify({ images }), {
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': `public, max-age=${CACHE_AGE}`
      },
      status: 200
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      documentation: 'https://unsplash.com/documentation'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.message.includes('Please provide') ? 400 : 500
    });
  }
});
