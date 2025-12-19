import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
};
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
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  const url = new URL(req.url);
  const googleApiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
  if (!googleApiKey) {
    return new Response(JSON.stringify({
      error: "Google Places API key not configured"
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 500
    });
  }
  try {
    /* ------------------------------------------------------------------
     * 1) PUBLIC PHOTO PROXY (so <img src=...> works without auth header)
     *    GET /functions/v1/google-places-proxy?photo_reference=...&maxwidth=640
     * ------------------------------------------------------------------*/ if (req.method === "GET" && url.searchParams.has("photo_reference")) {
      const photoRef = url.searchParams.get("photo_reference");
      const maxwidth = url.searchParams.get("maxwidth") ?? "640";
      const maxheight = url.searchParams.get("maxheight"); // optional
      // Simple IP-based rate limit for the public path
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      if (!checkRateLimit(`photo:${ip}`)) {
        return new Response(JSON.stringify({
          error: "Rate limit exceeded. Try again later."
        }), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          },
          status: 429
        });
      }
      const params = new URLSearchParams({
        photo_reference: photoRef,
        key: googleApiKey
      });
      if (maxheight) params.set("maxheight", maxheight);
      else params.set("maxwidth", maxwidth);
      // Follow the redirect and stream the image back
      const gRes = await fetch(`https://maps.googleapis.com/maps/api/place/photo?${params.toString()}`, {
        redirect: "follow"
      });
      if (!gRes.ok || !gRes.body) {
        const text = await gRes.text().catch(()=>"");
        return new Response(JSON.stringify({
          error: "Google Photos error",
          details: text
        }), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          },
          status: 502
        });
      }
      const headers = new Headers(corsHeaders);
      headers.set("Content-Type", gRes.headers.get("content-type") || "image/jpeg");
      headers.set("Cache-Control", "public, max-age=86400, immutable");
      return new Response(gRes.body, {
        headers,
        status: 200
      });
    }
    /* ------------------------------------------------------------------
     * For autocomplete and details, require a valid user token as before
     * ------------------------------------------------------------------*/ const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error("Invalid authentication token");
    }
    // Per-user rate limit (autocomplete + details)
    if (!checkRateLimit(`user:${user.id}`)) {
      return new Response(JSON.stringify({
        error: "Rate limit exceeded. Try again later."
      }), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 429
      });
    }
    /* ------------------------------------------------------------------
     * 2) AUTOCOMPLETE (GET)
     * ------------------------------------------------------------------*/ if (req.method === "GET") {
      const input = url.searchParams.get("input");
      const types = url.searchParams.get("types") || "establishment";
      const language = url.searchParams.get("language") || "en";
      // Use a sessiontoken to group user keystrokes
      const sessiontoken = url.searchParams.get("sessiontoken") || crypto.randomUUID();
      if (!input) throw new Error("Missing input parameter");
      const apiParams = new URLSearchParams({
        input,
        types,
        language,
        sessiontoken,
        key: googleApiKey
      }).toString();
      const googleUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${apiParams}`;
      const googleResponse = await fetch(googleUrl);
      const googleData = await googleResponse.json();
      if (!googleResponse.ok) {
        throw new Error(`Google API error: ${googleData.error_message || "Unknown error"}`);
      }
      return new Response(JSON.stringify(googleData), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 200
      });
    }
    /* ------------------------------------------------------------------
     * 3) PLACE DETAILS (POST)
     *    Includes 'photos' by default so the UI can render a strip.
     *    Allows optional 'fields' array in the request body.
     * ------------------------------------------------------------------*/ if (req.method === "POST") {
      const body = await req.json();
      const placeId = body.placeId || body.place_id;
      const fieldsArray = Array.isArray(body.fields) ? body.fields : undefined;
      if (!placeId) throw new Error("Missing placeId parameter");
      const fields = fieldsArray?.length ? fieldsArray.join(",") : "name,formatted_address,geometry,place_id,rating,website,formatted_phone_number,photos";
      const apiParams = new URLSearchParams({
        place_id: placeId,
        fields,
        key: googleApiKey
      }).toString();
      const googleUrl = `https://maps.googleapis.com/maps/api/place/details/json?${apiParams}`;
      const googleResponse = await fetch(googleUrl);
      const googleData = await googleResponse.json();
      if (!googleResponse.ok) {
        throw new Error(`Google API error: ${googleData.error_message || "Unknown error"}`);
      }
      return new Response(JSON.stringify(googleData), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        },
        status: 200
      });
    }
    // Otherwise
    return new Response(JSON.stringify({
      error: "Method not allowed"
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 405
    });
  } catch (error) {
    console.error("Google Places proxy error:", error);
    return new Response(JSON.stringify({
      error: "An internal server error occurred."
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      },
      status: 500
    });
  }
});
