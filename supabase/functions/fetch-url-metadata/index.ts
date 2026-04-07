import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://wanderluxe.io';
const ALLOWED_ORIGIN_PATTERNS = [/\.replit\.dev(:\d+)?$/, /\.repl\.co(:\d+)?$/, /\.replit\.app(:\d+)?$/];
function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin = (origin && ALLOWED_ORIGIN_PATTERNS.some(p => p.test(origin))) ? origin : ALLOWED_ORIGIN;
  return { 'Access-Control-Allow-Origin': allowOrigin, 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS' };
}
async function requireAuth(req: Request): Promise<{ userId: string; email?: string }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) throw new Error('Missing or invalid authorization header');
  const token = authHeader.slice(7);
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error('Invalid token');
  return { userId: data.user.id, email: data.user.email?.toLowerCase() };
}

function isAllowedUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '[::1]' ||
      /^127\./.test(hostname) ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
      /^169\.254\./.test(hostname) ||
      /^0\./.test(hostname) ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function fetchOpenGraphData(url: string) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const html = await response.text();
    // Create a simple parser for meta tags
    const getMetaContent = (property)=>{
      const match = html.match(new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i')) || html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, 'i'));
      return match ? match[1] : null;
    };
    return {
      ogImage: getMetaContent('og:image'),
      title: getMetaContent('og:title'),
      description: getMetaContent('og:description')
    };
  } catch (error) {
    console.error('Error fetching OpenGraph data:', error);
    return {};
  }
}
async function fetchGooglePlacesImage(url) {
  try {
    const domain = new URL(url).hostname;
    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      throw new Error('Google Places API key not configured');
    }
    // First, search for the place
    const searchResponse = await fetch(`https://places.googleapis.com/v1/places:searchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.photos'
      },
      body: JSON.stringify({
        textQuery: domain
      })
    });
    const searchData = await searchResponse.json();
    if (searchData.places?.[0]?.photos?.[0]?.name) {
      // Get the photo
      const photoResponse = await fetch(`https://places.googleapis.com/v1/places/photos/${searchData.places[0].photos[0].name}/media`, {
        headers: {
          'X-Goog-Api-Key': apiKey
        }
      });
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
serve(async (req)=>{
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    try { await requireAuth(req); } catch {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      });
    }
    const { url } = await req.json();
    if (!url) {
      throw new Error('URL is required');
    }
    if (!isAllowedUrl(url)) {
      return new Response(JSON.stringify({ error: 'Invalid or disallowed URL' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }
    // Try OpenGraph first
    const ogData = await fetchOpenGraphData(url);
    let imageUrl = ogData.ogImage;
    // If no OpenGraph image, try Google Places
    if (!imageUrl) {
      imageUrl = await fetchGooglePlacesImage(url);
    }
    return new Response(JSON.stringify({
      image_url: imageUrl,
      title: ogData.title,
      description: ogData.description
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('fetch-url-metadata error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch URL metadata'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
