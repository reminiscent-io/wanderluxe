
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
    console.log('Received photo ID:', photoId); // Debug log

    if (!photoId) {
      throw new Error('Photo ID is required');
    }

    // Clean up the photo ID to ensure proper format
    const cleanPhotoId = photoId.trim();
    console.log('Clean photo ID:', cleanPhotoId); // Debug log

    // Track the view of the photo
    const trackResponse = await fetch(`https://api.unsplash.com/photos/${cleanPhotoId}/download`, {
      headers: {
        Authorization: `Client-ID ${Deno.env.get('UNSPLASH_ACCESS_KEY')}`,
      },
    });

    if (!trackResponse.ok) {
      console.error('Track view failed:', await trackResponse.text()); // Debug log
    }

    const response = await fetch(`https://api.unsplash.com/photos/${cleanPhotoId}`, {
      headers: {
        Authorization: `Client-ID ${Deno.env.get('UNSPLASH_ACCESS_KEY')}`,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Unsplash API error:', errorText); // Debug log
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Unsplash API response:', data); // Debug log
    
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
    console.error('Error in Edge Function:', error); // Debug log
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
