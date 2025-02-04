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
    const { keywords } = await req.json();
    
    // Validate input parameters
    if (!keywords?.trim() || typeof keywords !== 'string') {
      throw new Error('Please provide valid search keywords');
    }

    const cleanKeywords = keywords.trim().toLowerCase();
    const searchQuery = `${cleanKeywords} landscape scenic travel destination -people -person -portrait -selfie`;
    console.log('Search query:', searchQuery);
    
    // Use search endpoint instead of random for better relevance
    const unsplashUrl = new URL('https://api.unsplash.com/search/photos');
    unsplashUrl.searchParams.set('query', searchQuery);
    unsplashUrl.searchParams.set('orientation', 'landscape');
    unsplashUrl.searchParams.set('per_page', '3');
    unsplashUrl.searchParams.set('content_filter', 'high');
    unsplashUrl.searchParams.set('order_by', 'relevant');

    console.log('Requesting URL:', unsplashUrl.toString());

    const response = await fetch(unsplashUrl, {
      headers: {
        'Authorization': `Client-ID ${Deno.env.get('UNSPLASH_ACCESS_KEY')}`,
        'Accept-Version': 'v1'
      }
    });

    console.log('Unsplash response status:', response.status);

    if (response.status === 404) {
      throw new Error('No images found for these keywords');
    }

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Unsplash API error response:', data);
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

    console.log('Processed images:', images);

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