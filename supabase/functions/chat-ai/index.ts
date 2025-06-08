// chat-ai/index.ts – Supabase Edge Function (refactored June 2025)
// -----------------------------------------------------------------------------
//  This edge function powers the conversational travel assistant for WanderLuxe.
//  It has been fully refactored for clarity, stronger typing, stricter runtime
//  safety, and improved performance while preserving all original features.
// -----------------------------------------------------------------------------

/* ---------------------------------------------------------------------------
 *  Imports
 * ---------------------------------------------------------------------------*/
import { serve } from "https://deno.land/std@0.210.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&no-check";

/* ---------------------------------------------------------------------------
 *  Environment & Constants
 * ---------------------------------------------------------------------------*/
// Read environment variables **once** at module‑scope so that they are cached
// between invocations inside the same edge container. This avoids repeatedly
// touching the environment for every request, shaving a few micro‑seconds off
// the cold‑start path.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY") ?? "";

// Models – centralised definitions in case we need to upgrade later.
const OPENAI_MODEL = "gpt-4o";                                      // Released 13 May 2024
const PERPLEXITY_MODEL = "llama-3.1-sonar-small-128k-online";

// Allowlist of origins for CORS. Feel free to extend this list or move it to
// an environment variable (comma‑separated) if you have multiple front‑ends.
const ALLOWED_ORIGINS = [
  "https://app.wanderluxe.com",     // production
  "http://localhost:5173",          // local dev (Vite)
];

// Compile once; runs on every request to detect 4★+ luxury properties.
const LUXURY_HOTEL_REGEX = new RegExp(
  [
    "Ritz",
    "Four Seasons",
    "St\\.? Regis",
    "Mandarin Oriental",
    "Park Hyatt",
    "Edition",
    "Bulgari",
    "Aman",
    "Rosewood",
    "Peninsula",
  ].join("|"),
  "i",
);

/* ---------------------------------------------------------------------------
 *  Helpers
 * ---------------------------------------------------------------------------*/

/**
 * Generates CORS headers dynamically.
 */
function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("Origin") ?? "*";
  // If the request's origin is in our allow‑list we echo it back; otherwise we
  // default to "*" which is fine for GET/OPTIONS but will be rejected by the
  // browser for credentialed requests. Change according to your security needs.
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "*";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "Authorization, X-Client-Info, ApiKey, Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

/**
 * Utility to wrap JSON data in a `Response`.
 */
function jsonResponse(data: unknown, init: ResponseInit = {}): Response {
  const headers: HeadersInit = {
    ...init.headers,
    "Content-Type": "application/json",
  };
  return new Response(JSON.stringify(data), { ...init, headers });
}

/**
 * Maps an Error to a sensible HTTP status code.
 */
function toStatusCode(err: Error): number {
  if (/unauthorized/i.test(err.message)) return 401;
  if (/access denied/i.test(err.message)) return 403;
  if (/not found/i.test(err.message)) return 404;
  if (/required|invalid json/i.test(err.message)) return 400;
  return 500;
}

/**
 * Safely parses JSON from a Request and validates that it contains the fields
 * we need. Throws human‑friendly Errors if anything is missing or malformed.
 */
async function parseAndValidateBody(req: Request): Promise<{
  message: string;
  tripId: string;
  attachments?: Array<{ url: string }>;
}> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new Error("Invalid JSON in request body");
  }

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    throw new Error("Request body must be a JSON object");
  }

  const { message, tripId, attachments } = body as Record<string, unknown>;

  if (!message || typeof message !== "string" || !message.trim()) {
    throw new Error("`message` is required and must be a non‑empty string");
  }
  if (!tripId || typeof tripId !== "string") {
    throw new Error("`tripId` is required and must be a string");
  }
  if (
    attachments &&
    !(
      Array.isArray(attachments) &&
      attachments.every((a) => a && typeof a.url === "string")
    )
  ) {
    throw new Error("`attachments` must be an array of objects with a `url`");
  }

  return { message, tripId, attachments } as {
    message: string;
    tripId: string;
    attachments?: Array<{ url: string }>;
  };
}

/**
 * Calculates the nightly rate and returns a budget tier.
 */
function classifyBudget(total: number, nights: number, hotelName = ""): string {
  // Explicit luxury detection by hotel brand overrides calculations.
  if (LUXURY_HOTEL_REGEX.test(hotelName)) return "luxury";

  const nightly = total / Math.max(nights, 1);
  if (nightly > 400) return "luxury";
  if (nightly > 200) return "upscale";
  if (nightly < 100) return "budget‑conscious";
  return "mid‑range";
}

/* ---------------------------------------------------------------------------
 *  Main Edge Function Handler
 * ---------------------------------------------------------------------------*/
serve(async (req) => {
  // ------------------------------------------------ CORS pre‑flight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  try {
    // ------------------------------------------------ Supabase client per request
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    // ------------------------------------------------ Auth
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    // ------------------------------------------------ Body validation
    const { message, tripId, attachments } = await parseAndValidateBody(req);

    // ------------------------------------------------ Trip access check
    const { data: trip, error: tripErr } = await supabase
      .from("trips")
      .select(
        `trip_id,
         destination,
         arrival_date,
         departure_date,
         user_id,
         cover_image_url`,
      )
      .eq("trip_id", tripId)
      .single();

    if (tripErr || !trip) throw new Error("Trip not found or access denied");

    const ownsTrip = trip.user_id === user.id;
    if (!ownsTrip) {
      const { data: share } = await supabase
        .from("trip_shares")
        .select("id")
        .eq("trip_id", tripId)
        .eq("shared_by_user_id", user.id)
        .single();
      if (!share) throw new Error("Access denied to this trip");
    }

    // ------------------------------------------------ Parallel fetches (batched)
    const [
      { data: chatHistory },
      { data: accommodations },
      { data: activities },
      { data: reservations },
      { data: transportation },
      { data: expenses },
      { data: visionBoard },
      { data: tripDays },
    ] = await Promise.all([
      supabase
        .from("chat_logs")
        .select("role, message")
        .eq("trip_id", tripId)
        .order("timestamp", { ascending: false })
        .limit(10),

      supabase
        .from("accommodations")
        .select(
          "hotel, hotel_address, initial_accommodation_day, final_accommodation_day, cost, currency",
        )
        .eq("trip_id", tripId),

      supabase
        .from("day_activities")
        .select("title, description, time, cost, currency")
        .eq("trip_id", tripId),

      supabase
        .from("reservations")
        .select(
          "restaurant_name, cuisine_type, reservation_time, party_size, notes",
        )
        .eq("trip_id", tripId),

      supabase
        .from("transportation")
        .select(
          "type, departure_location, arrival_location, departure_time, arrival_time, cost, currency",
        )
        .eq("trip_id", tripId),

      supabase
        .from("expenses")
        .select("description, cost, currency, expense_type")
        .eq("trip_id", tripId),

      supabase
        .from("vision_board_items")
        .select("title, description, category, image_url")
        .eq("trip_id", tripId),

      supabase
        .from("trip_days")
        .select("date, day_number")
        .eq("trip_id", tripId)
        .order("day_number", { ascending: true }),
    ]);

    // ------------------------------------------------ Budget + Location logic
    const primaryHotel = accommodations?.[0];
    let locationContext = trip.destination;
    let budgetLevel = "mid‑range";

    if (primaryHotel) {
      locationContext = primaryHotel.hotel_address || trip.destination;

      if (
        primaryHotel.cost &&
        primaryHotel.initial_accommodation_day &&
        primaryHotel.final_accommodation_day
      ) {
        const nights =
          (new Date(primaryHotel.final_accommodation_day).valueOf() -
            new Date(primaryHotel.initial_accommodation_day).valueOf()) /
            (1000 * 60 * 60 * 24) || 1;
        budgetLevel = classifyBudget(primaryHotel.cost, nights, primaryHotel.hotel);
      } else if (LUXURY_HOTEL_REGEX.test(primaryHotel.hotel)) {
        budgetLevel = "luxury";
      }
    }

    // ------------------------------------------------ Trip context string for LLM
    const tripContext = `
TRIP OVERVIEW:
- Trip Title or Theme: ${trip.destination}
- Primary Location: ${locationContext}
- Arrival Date: ${trip.arrival_date || "Not set"}
- Departure Date: ${trip.departure_date || "Not set"}
- Duration: ${tripDays?.length || 0} days
- Budget Level: ${budgetLevel}

PRIMARY ACCOMMODATION:${primaryHotel ? `
- Hotel: ${primaryHotel.hotel}
- Location: ${primaryHotel.hotel_address}
- Dates: ${primaryHotel.initial_accommodation_day} → ${primaryHotel.final_accommodation_day}
- Cost: ${primaryHotel.cost} ${primaryHotel.currency}
- Budget Category: ${budgetLevel}` : "\n- No primary accommodation set"}

OTHER ACCOMMODATIONS:${accommodations?.length > 1
        ? accommodations.slice(1).map((acc) => `
  - ${acc.hotel} (${acc.hotel_address})
    Dates: ${acc.initial_accommodation_day} → ${acc.final_accommodation_day}
    Cost: ${acc.cost} ${acc.currency}`).join("")
        : "\n  - None"}

EXISTING RESTAURANT RESERVATIONS:${reservations?.length
        ? reservations.map((res) => `
  - ${res.restaurant_name} (${res.cuisine_type})
    Time: ${res.reservation_time}, Party: ${res.party_size}
    ${res.notes ? `Notes: ${res.notes}` : ""}`).join("")
        : "\n  - No restaurant reservations yet"}

PLANNED ACTIVITIES:${activities?.length
        ? activities.map((act) => `
  - ${act.title}: ${act.description}
    ${act.time ? `Time: ${act.time}` : ""}
    ${act.cost ? `Cost: ${act.cost} ${act.currency}` : ""}`).join("")
        : "\n  - No activities planned yet"}

TRANSPORTATION:${transportation?.length
        ? transportation.map((t) => `
  - ${t.type}: ${t.departure_location} → ${t.arrival_location}
    Departure: ${t.departure_time}, Arrival: ${t.arrival_time}
    ${t.cost ? `Cost: ${t.cost} ${t.currency}` : ""}`).join("")
        : "\n  - No transportation booked yet"}

BUDGET / EXPENSES:${expenses?.length
        ? expenses.map((e) => `
  - ${e.description}: ${e.cost} ${e.currency} (${e.expense_type})`).join("")
        : "\n  - No expenses tracked yet"}

USER INTERESTS / VISION BOARD:${visionBoard?.length
        ? visionBoard.map((v) => `
  - ${v.title} (${v.category}): ${v.description}`).join("")
        : "\n  - No preferences specified yet"}

TRIP DAYS:${tripDays?.length
        ? tripDays.map((d) => `
  - Day ${d.day_number}: ${d.date}`).join("")
        : "\n  - No daily structure set"}
`;

    // ------------------------------------------------ Conversation history string
    const conversationHistory = chatHistory?.reverse().map((m) => `${m.role}: ${m.message}`).join("\n") ?? "";

    // ------------------------------------------------ Optional receipt image processing with OpenAI Vision
    let extractedData: unknown = null;
    if (attachments?.length) {
      try {
        // We currently process only the first attachment for brevity. Extend as‑needed.
        const imageUrl = attachments[0].url;
        const fileName = imageUrl.split("/").slice(-3).join("/"); // user_id/trip_id/filename

        // Signed URL valid for 1 hour.
        const { data: signedUrlData, error: signedUrlErr } = await supabase.storage
          .from("chat-attachments")
          .createSignedUrl(fileName, 3600);

        if (signedUrlErr) throw signedUrlErr;
        const accessibleImageUrl = signedUrlData.signedUrl;

        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: OPENAI_MODEL,
            messages: [
              {
                role: "system",
                content: `You are an expert receipt and document analyzer for a travel planning app. Analyse the uploaded image and extract structured data for travel items.\n\nCLASSIFY the document as one of: hotel, flight, reservation, activity\n\nExtract relevant data based on type:\n\nHOTEL:\n- hotel_name (required)\n- address (required)\n- check_in_date (required, format: YYYY-MM-DD)\n- check_out_date (required, format: YYYY-MM-DD)\n- total_cost (number)\n- currency (default: USD)\n- confirmation_number\n\nFLIGHT:\n- airline (required)\n- departure_city (required)\n- arrival_city (required)\n- departure_time (required, format: YYYY-MM-DD HH:MM)\n- arrival_time (required, format: YYYY-MM-DD HH:MM)\n- flight_number\n- total_cost (number)\n- currency (default: USD)\n\nRESERVATION:\n- restaurant_name (required)\n- date (required, format: YYYY-MM-DD)\n- time (required, format: HH:MM)\n- party_size (number)\n- cuisine_type\n- notes\n\nACTIVITY:\n- activity_name (required)\n- date (required, format: YYYY-MM-DD)\n- time (format: HH:MM)\n- description\n- cost (number)\n- currency (default: USD)\n\nRespond **only** in JSON format:\n{\n  "type": "hotel|flight|reservation|activity",\n  "data": { extracted fields },\n  "missingFields": ["field1", "field2"],\n  "readyToAdd": boolean\n}\n\nSet readyToAdd to true only if ALL required fields are present.`,
              },
              {
                role: "user",
                content: [
                  { type: "text", text: "Please analyse this receipt and extract the travel data:" },
                  { type: "image_url", image_url: { url: accessibleImageUrl, detail: "high" } },
                ],
              },
            ],
            max_tokens: 1000,
            response_format: { type: "json_object" },
          }),
        });

        if (!openaiRes.ok) throw new Error(`OpenAI API error ${openaiRes.status}`);
        const openaiJson = await openaiRes.json();
        extractedData = JSON.parse(openaiJson.choices[0].message.content);
      } catch (visionErr) {
        console.error("Vision analysis failed", visionErr);
        // We swallow the error so that chat continues even if vision fails.
      }
    }

    // ------------------------------------------------ Chat generation via Perplexity API
    const perplexityRes = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: PERPLEXITY_MODEL,
        messages: [
          {
            role: "system",
            content: `You are a sophisticated travel assistant for WanderLuxe, a luxury travel planning platform. You ONLY assist with travel‑related topics and provide highly personalised recommendations.\n\nSCOPE – You can help with:\n- Trip planning, itineraries, and scheduling\n- Activities, attractions, and experiences\n- Restaurants, dining, and food recommendations\n- Transportation (flights, trains, cars, local transit)\n- Accommodations and hotels\n- Weather and climate information\n- Packing and clothing recommendations for destinations\n- Local customs, culture, and etiquette\n- Currency, tipping, and travel costs\n- Safety tips and travel advisories\n- Visa requirements and travel documents\n- Language basics and communication tips\n- Shopping and local markets\n- Entertainment and nightlife\n- Day trips and excursions\n- Travel insurance and health considerations\n- Time zones and jet lag management\n- Photography spots and travel memories\n- Travel apps and tools\n- Luggage and travel gear recommendations\n- Questions about their current trip bookings, reservations, or plans\n\nIMPORTANT: If a user asks about topics unrelated to travel (e.g. work queries, politics, etc.), respond: "I'm your travel assistant and can only help with travel‑related questions about your trip. Is there anything about your travel plans I can assist you with?"\n\n${tripContext}\n\nPrevious conversation:\n${conversationHistory}\n\nINSTRUCTIONS:\n- Use hotel location as your PRIMARY geographic anchor\n- Match recommendations to the budget level (${budgetLevel})\n- Ask clarifying questions when details are vague\n- Avoid redundancy with existing bookings\n- Be enthusiastic and actionable!`,
          },
          { role: "user", content: message },
        ],
        max_tokens: 500,
        temperature: 0.7,
        top_p: 0.9,
        stream: false,
      }),
    });

    if (!perplexityRes.ok) throw new Error(`Perplexity API error ${perplexityRes.status}`);
    const perplexJson = await perplexityRes.json();
    const aiBaseMessage = perplexJson.choices?.[0]?.message?.content ??
      "Sorry, I could not generate a response. Please try again.";

    // ------------------------------------------------ Augment AI message with vision results (if any)
    let finalAiMessage = aiBaseMessage;
    if (extractedData && typeof extractedData === "object") {
      // Narrow type for TypeScript's benefit.
      const { type, missingFields, readyToAdd } = extractedData as {
        type?: string;
        missingFields?: string[];
        readyToAdd?: boolean;
      };

      if (readyToAdd) {
        finalAiMessage = `Great! I have analysed your ${type} receipt and extracted all the necessary information. Everything looks complete and I am ready to add it to your itinerary.\n\n${aiBaseMessage}`;
      } else if (missingFields?.length) {
        finalAiMessage = `I have analysed your ${type} receipt and extracted most of the information, but I need a few more details:\n\n**Missing information:** ${missingFields.join(", ")}\n\nCould you please provide these so I can add the ${type} to your itinerary?\n\n${aiBaseMessage}`;
      }
    }

    // ------------------------------------------------ Persist chat (atomic)
    const nowIso = new Date().toISOString();
    const [{ data: userInsertErr }, { data: aiInsertErr }] = await Promise.all([
      supabase.from("chat_logs").insert({
        id: crypto.randomUUID(),
        trip_id: tripId,
        user_id: user.id,
        role: "user",
        message,
        timestamp: nowIso,
      }),
      supabase.from("chat_logs").insert({
        id: crypto.randomUUID(),
        trip_id: tripId,
        user_id: user.id,
        role: "ai",
        message: finalAiMessage,
        timestamp: nowIso,
      }),
    ]);

    if (userInsertErr || aiInsertErr) {
      console.error("Failed to persist chat messages", userInsertErr, aiInsertErr);
    }

    // ------------------------------------------------ Response to caller
    return jsonResponse(
      {
        success: true,
        aiMessage: {
          role: "ai",
          message: finalAiMessage,
          timestamp: nowIso,
          extractedData: extractedData ?? undefined,
        },
      },
      { status: 200, headers: corsHeaders(req) },
    );
  } catch (err) {
    const status = toStatusCode(err as Error);
    console.error("chat-ai error:", err);

    return jsonResponse(
      {
        success: false,
        error: (err as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status, headers: corsHeaders(req) },
    );
  }
});
