
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders 
    });
  }

  try {
    const { photoId } = await req.json();

    if (!photoId) {
      throw new Error('Photo ID is required');
    }

    // Track the view of the photo
    await fetch(`https://api.unsplash.com/photos/${photoId}/download`, {
      headers: {
        Authorization: `Client-ID ${Deno.env.get('UNSPLASH_ACCESS_KEY')}`,
      },
    });

    const response = await fetch(`https://api.unsplash.com/photos/${photoId}`, {
      headers: {
        Authorization: `Client-ID ${Deno.env.get('UNSPLASH_ACCESS_KEY')}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Construct optimized image URL with dynamic resizing
    const width = 1200; // Default width, adjust based on your needs
    const optimizedUrl = new URL(data.urls.raw);
    optimizedUrl.searchParams.set('w', width.toString());
    optimizedUrl.searchParams.set('q', '80');
    optimizedUrl.searchParams.set('fm', 'webp');
    optimizedUrl.searchParams.set('auto', 'compress');

    return new Response(
      JSON.stringify({
        optimizedUrl: optimizedUrl.toString(),
        alt_description: data.alt_description,
        photographer: data.user.name,
        photographerUrl: data.user.links.html,
        unsplashUrl: data.links.html,
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch Unsplash metadata',
        details: error.message
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      }
    );
  }
});

