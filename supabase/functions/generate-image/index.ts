import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cache responses for 1 hour to reduce API calls
const CACHE_AGE = 3600;

// Rate limiting configuration
const RATE_LIMIT = 50; // requests per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

// In-memory store for rate limiting
const rateLimitStore = new Map<string, number[]>();

function isRateLimited(clientIP: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  
  // Get existing timestamps for this IP
  let timestamps = rateLimitStore.get(clientIP) || [];
  
  // Remove timestamps outside the current window
  timestamps = timestamps.filter(timestamp => timestamp > windowStart);
  
  // Check if rate limit is exceeded
  if (timestamps.length >= RATE_LIMIT) {
    console.log(`Rate limit exceeded for IP: ${clientIP}`);
    return true;
  }
  
  // Add current timestamp and update store
  timestamps.push(now);
  rateLimitStore.set(clientIP, timestamps);
  
  return false;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP from request headers
    const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
    
    // Check rate limit
    if (isRateLimited(clientIP)) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again later.',
          limit: RATE_LIMIT,
          window: 'hour'
        }), {
        status: 429,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Retry-After': '3600'
        }
      });
    }

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