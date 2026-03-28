import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from '../_shared/cors.ts';
// Rate limiting configuration
const RATE_LIMIT = 100; // requests per hour per key
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const rateLimitStore = new Map();
function checkRateLimit(key) {
  const now = Date.now();
  const arr = rateLimitStore.get(key) || [];
  const valid = arr.filter((t)=>now - t < RATE_LIMIT_WINDOW);
  if (valid.length >= RATE_LIMIT) return false;
  valid.push(now);
  rateLimitStore.set(key, valid);
  return true;
}

function jsonResponse(body, status = 200, cors: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    headers: { ...cors, "Content-Type": "application/json" },
    status
  });
}

function rateLimitResponse(cors: Record<string, string> = {}) {
  return jsonResponse({ error: "Rate limit exceeded. Try again later." }, 429, cors);
}

async function handlePhotoProxy(url, googleApiKey, req, cors: Record<string, string> = {}) {
  const photoRef = url.searchParams.get("photo_reference");
  const maxwidth = url.searchParams.get("maxwidth") ?? "640";
  const maxheight = url.searchParams.get("maxheight");

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(`photo:${ip}`)) return rateLimitResponse(cors);

  const params = new URLSearchParams({ photo_reference: photoRef, key: googleApiKey });
  if (maxheight) params.set("maxheight", maxheight);
  else params.set("maxwidth", maxwidth);

  const gRes = await fetch(`https://maps.googleapis.com/maps/api/place/photo?${params.toString()}`, {
    redirect: "follow"
  });

  if (!gRes.ok || !gRes.body) {
    const text = await gRes.text().catch(()=>"");
    return jsonResponse({ error: "Google Photos error", details: text }, 502, cors);
  }

  const headers = new Headers(cors);
  headers.set("Content-Type", gRes.headers.get("content-type") || "image/jpeg");
  headers.set("Cache-Control", "public, max-age=86400, immutable");
  return new Response(gRes.body, { headers, status: 200 });
}

async function handleAutocomplete(url, googleApiKey, cors: Record<string, string> = {}) {
  const input = url.searchParams.get("input");
  const types = url.searchParams.get("types") || "";
  const language = url.searchParams.get("language") || "en";
  const sessiontoken = url.searchParams.get("sessiontoken") || crypto.randomUUID();

  if (!input) throw new Error("Missing input parameter");

  const apiParams = new URLSearchParams({ input, language, sessiontoken, key: googleApiKey });
  if (types) apiParams.set("types", types);

  const googleUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${apiParams.toString()}`;
  const googleResponse = await fetch(googleUrl);
  const googleData = await googleResponse.json();

  if (!googleResponse.ok) {
    throw new Error(`Google API error: ${googleData.error_message || "Unknown error"}`);
  }
  return jsonResponse(googleData, 200, cors);
}

async function handlePlaceDetails(req, googleApiKey, cors: Record<string, string> = {}) {
  const body = await req.json();
  const placeId = body.placeId || body.place_id;
  const fieldsArray = Array.isArray(body.fields) ? body.fields : undefined;

  if (!placeId) throw new Error("Missing placeId parameter");

  const fields = fieldsArray?.length ? fieldsArray.join(",") : "name,formatted_address,geometry,place_id,rating,website,formatted_phone_number,photos";
  const apiParams = new URLSearchParams({ place_id: placeId, fields, key: googleApiKey }).toString();
  const googleUrl = `https://maps.googleapis.com/maps/api/place/details/json?${apiParams}`;
  const googleResponse = await fetch(googleUrl);
  const googleData = await googleResponse.json();

  if (!googleResponse.ok) {
    throw new Error(`Google API error: ${googleData.error_message || "Unknown error"}`);
  }
  return jsonResponse(googleData, 200, cors);
}

async function authenticateUser(req) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) throw new Error("Missing authorization header");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) throw new Error("Invalid authentication token");
  return user;
}

serve(async (req)=>{
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const googleApiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
  if (!googleApiKey) {
    return jsonResponse({ error: "Google Places API key not configured" }, 500, corsHeaders);
  }

  try {
    // 1) Public photo proxy (no auth required)
    if (req.method === "GET" && url.searchParams.has("photo_reference")) {
      return await handlePhotoProxy(url, googleApiKey, req, corsHeaders);
    }

    // 2) Place Details (POST) — allow anonymous access for public trip viewing
    //    Uses IP-based rate limiting when unauthenticated
    if (req.method === "POST") {
      const authHeader = req.headers.get("authorization");
      if (authHeader) {
        const user = await authenticateUser(req);
        if (!checkRateLimit(`user:${user.id}`)) return rateLimitResponse(corsHeaders);
      } else {
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        if (!checkRateLimit(`details:${ip}`)) return rateLimitResponse(corsHeaders);
      }
      return await handlePlaceDetails(req, googleApiKey, corsHeaders);
    }

    // 3) Autocomplete (GET) — requires authentication (used only when editing)
    const user = await authenticateUser(req);
    if (!checkRateLimit(`user:${user.id}`)) return rateLimitResponse(corsHeaders);

    if (req.method === "GET") {
      return await handleAutocomplete(url, googleApiKey, corsHeaders);
    }

    return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
  } catch (error) {
    console.error("Google Places proxy error:", error);
    return jsonResponse({ error: "An internal server error occurred." }, 500, corsHeaders);
  }
});
