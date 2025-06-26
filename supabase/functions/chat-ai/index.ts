// chat-ai/index.ts – Supabase Edge Function (refactored June 2025, updated for Persona & Streaming)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Environment & constants
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY") ?? "";
// Model definitions
const OPENAI_MODEL = "gpt-4o"; // GPT-4 (Vision-enabled) for document parsing
const PERPLEXITY_MODEL = "llama-3.1-sonar-large-128k-online";
// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  "https://app.wanderluxe.com",
  "http://localhost:5173",
  "https://wanderluxe.io",
  "https://www.wanderluxe.io"
];
// Precompile regex for detecting luxury hotels (4★+ brands)
const LUXURY_HOTEL_REGEX = new RegExp([
  "Ritz",
  "Four Seasons",
  "St\\.? Regis",
  "Mandarin Oriental",
  "Park Hyatt",
  "Edition",
  "Bulgari",
  "Aman",
  "Rosewood",
  "Peninsula"
].join("|"), "i");
// CORS helper
function corsHeaders(req) {
  const origin = req.headers.get("Origin") ?? "*";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "Authorization, X-Client-Info, ApiKey, Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
}
// Utility to wrap JSON data in a Response
function jsonResponse(data, init = {}) {
  const headers = {
    ...init.headers,
    "Content-Type": "application/json"
  };
  return new Response(JSON.stringify(data), {
    ...init,
    headers
  });
}
// Map errors to appropriate HTTP status codes
function toStatusCode(err) {
  if (/unauthorized/i.test(err.message)) return 401;
  if (/access denied/i.test(err.message)) return 403;
  if (/not found/i.test(err.message)) return 404;
  if (/required|invalid json/i.test(err.message)) return 400;
  return 500;
}
// Parse JSON request body and validate required fields
async function parseAndValidateBody(req) {
  let body;
  try {
    body = await req.json();
  } catch  {
    throw new Error("Invalid JSON in request body");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Request body must be a JSON object");
  }
  const { message, tripId, attachments } = body;
  if (!message || typeof message !== "string" || !message.trim()) {
    throw new Error("`message` is required and must be a non-empty string");
  }
  if (!tripId || typeof tripId !== "string") {
    throw new Error("`tripId` is required and must be a string");
  }
  if (attachments && !(Array.isArray(attachments) && attachments.every((a)=>a && typeof a.url === "string"))) {
    throw new Error("`attachments` must be an array of objects with a `url`");
  }
  return {
    message,
    tripId,
    attachments: attachments ?? []
  };
}
// Determine budget tier from cost and nights (or luxury brand override)
function classifyBudget(total, nights, hotelName = "") {
  if (LUXURY_HOTEL_REGEX.test(hotelName)) return "luxury";
  const nightly = total / Math.max(nights, 1);
  if (nightly > 400) return "luxury";
  if (nightly > 200) return "upscale";
  if (nightly < 100) return "budget-conscious";
  return "mid-range";
}
// Main Edge Function handler
serve(async (req)=>{
  // CORS pre-flight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders(req)
    });
  }
  try {
    // Create Supabase client for this request, with user's JWT for RLS
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: req.headers.get("Authorization") ?? ""
        }
      }
    });
    // Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");
    // Parse and validate request body
    const { message, tripId, attachments } = await parseAndValidateBody(req);
    // **Security: Filter abusive or off-topic inputs**
    // Extract actual user question (strip any prepended context like "User question:")
    let userQuestion = message;
    const idx = message.indexOf("User question:");
    if (idx !== -1) userQuestion = message.slice(idx + "User question:".length).trim();
    // Basic off-topic detection (non-travel queries) via keywords
    const offTopicPattern = /(homework|assignment|project|politics|election|stock|investment|money advice|finance|tax|coding|programming)/i;
    const abusePattern = /(fuck|bitch|asshole|idiot|stupid|hate|kill|rape|shit|nigger|cunt)/i;
    if (abusePattern.test(userQuestion)) {
      // Respond with a polite redirection on abusive language
      return jsonResponse({
        success: false,
        error: "I'm sorry, I can only continue if we keep our conversation respectful."
      }, {
        status: 400,
        headers: corsHeaders(req)
      });
    }
    if (offTopicPattern.test(userQuestion)) {
      // Politely redirect off-topic queries to focus on travel
      return jsonResponse({
        success: true,
        aiMessage: {
          role: "ai",
          message: "I'm your travel assistant and can only help with travel-related questions about your trip. Is there anything about your travel plans I can assist you with?",
          timestamp: new Date().toISOString()
        }
      }, {
        status: 200,
        headers: corsHeaders(req)
      });
    }
    // Fetch trip details and verify access (ownership or shared)
    const { data: trip, error: tripErr } = await supabase.from("trips").select("trip_id, destination, arrival_date, departure_date, user_id, cover_image_url").eq("trip_id", tripId).single();
    if (tripErr || !trip) throw new Error("Trip not found or access denied");
    const ownsTrip = trip.user_id === user.id;
    if (!ownsTrip) {
      const { data: share } = await supabase.from("trip_shares").select("id").eq("trip_id", tripId).eq("shared_by_user_id", user.id).single();
      if (!share) throw new Error("Access denied to this trip");
    }
    // Parallel fetch of related trip data for context
    const [{ data: chatHistory }, { data: accommodations }, { data: activities }, { data: reservations }, { data: transportation }, { data: expenses }, { data: visionBoard }, { data: tripDays }, { data: memorySummary }] = await Promise.all([
      supabase.from("chat_logs").select("role, message").eq("trip_id", tripId).order("timestamp", {
        ascending: false
      }).limit(10),
      supabase.from("accommodations").select("hotel, hotel_address, initial_accommodation_day, final_accommodation_day, cost, currency").eq("trip_id", tripId),
      supabase.from("day_activities").select("title, description, time, cost, currency").eq("trip_id", tripId),
      supabase.from("reservations").select("restaurant_name, cuisine_type, reservation_time, party_size, notes").eq("trip_id", tripId),
      supabase.from("transportation").select("type, departure_location, arrival_location, departure_time, arrival_time, cost, currency").eq("trip_id", tripId),
      supabase.from("expenses").select("description, cost, currency, expense_type").eq("trip_id", tripId),
      supabase.from("vision_board_items").select("title, description, category, image_url").eq("trip_id", tripId),
      supabase.from("trip_days").select("date, day_number").eq("trip_id", tripId).order("day_number", {
        ascending: true
      }),
      supabase.from("chat_memory").select("summary").eq("trip_id", tripId).single()
    ]);
    // Determine primary location context and budget level
    const primaryHotel = accommodations?.[0];
    let locationContext = trip.destination;
    let budgetLevel = "mid-range";
    if (primaryHotel) {
      locationContext = primaryHotel.hotel_address || trip.destination;
      if (primaryHotel.cost && primaryHotel.initial_accommodation_day && primaryHotel.final_accommodation_day) {
        const nights = (new Date(primaryHotel.final_accommodation_day).valueOf() - new Date(primaryHotel.initial_accommodation_day).valueOf()) / (1000 * 60 * 60 * 24) || 1;
        budgetLevel = classifyBudget(primaryHotel.cost, nights, primaryHotel.hotel);
      } else if (LUXURY_HOTEL_REGEX.test(primaryHotel.hotel)) {
        budgetLevel = "luxury";
      }
    }
    // Assemble trip overview context for the LLM prompt
    const tripContext = `
TRIP OVERVIEW:
- Trip Destination/Theme: ${trip.destination}
- Primary Location: ${locationContext}
- Arrival Date: ${trip.arrival_date || "Not set"}
- Departure Date: ${trip.departure_date || "Not set"}
- Duration: ${tripDays?.length || 0} days
- Budget Level: ${budgetLevel}

PRIMARY ACCOMMODATION:${primaryHotel ? `
- Hotel: ${primaryHotel.hotel}
- Location: ${primaryHotel.hotel_address}
- Dates: ${primaryHotel.initial_accommodation_day} → ${primaryHotel.final_accommodation_day}
- Cost: ${primaryHotel.cost} ${primaryHotel.currency}
- Budget Category: ${budgetLevel}` : "\n- None specified"}

OTHER ACCOMMODATIONS:${accommodations && accommodations.length > 1 ? accommodations.slice(1).map((acc)=>`
  - ${acc.hotel} (${acc.hotel_address})
    Dates: ${acc.initial_accommodation_day} → ${acc.final_accommodation_day}
    Cost: ${acc.cost} ${acc.currency}`).join("") : "\n  - None"}

EXISTING RESTAURANT RESERVATIONS:${reservations && reservations.length ? reservations.map((res)=>`
  - ${res.restaurant_name} (${res.cuisine_type})
    Time: ${res.reservation_time}, Party: ${res.party_size}${res.notes ? `, Notes: ${res.notes}` : ""}`).join("") : "\n  - None yet"}

PLANNED ACTIVITIES:${activities && activities.length ? activities.map((act)=>`
  - ${act.title}: ${act.description}
    ${act.time ? `Time: ${act.time}` : ""}${act.cost ? `, Cost: ${act.cost} ${act.currency}` : ""}`).join("") : "\n  - None yet"}

TRANSPORTATION:${transportation && transportation.length ? transportation.map((t)=>`
  - ${t.type}: ${t.departure_location} → ${t.arrival_location}
    Departure: ${t.departure_time}, Arrival: ${t.arrival_time}${t.cost ? `, Cost: ${t.cost} ${t.currency}` : ""}`).join("") : "\n  - None booked yet"}

BUDGET / EXPENSES:${expenses && expenses.length ? expenses.map((e)=>`
  - ${e.description}: ${e.cost} ${e.currency} (${e.expense_type})`).join("") : "\n  - None tracked yet"}

USER INTERESTS / VISION BOARD:${visionBoard && visionBoard.length ? visionBoard.map((v)=>`
  - ${v.title} (${v.category}): ${v.description}`).join("") : "\n  - None specified"}

TRIP DAYS:${tripDays && tripDays.length ? tripDays.map((d)=>`
  - Day ${d.day_number}: ${d.date}`).join("") : "\n  - Not defined"}
`;
    // Prepare conversation history with token management
    const summaryText = memorySummary?.summary?.trim();
    let conversationHistory = "";
    if (summaryText) {
      conversationHistory = `**Conversation Summary**: ${summaryText}`;
    } else if (chatHistory && chatHistory.length > 0) {
      // Limit conversation history to last 5 messages to prevent token overflow
      const recentHistory = chatHistory.slice(-5).reverse();
      conversationHistory = recentHistory.map((m)=>`${m.role}: ${m.message.substring(0, 200)}${m.message.length > 200 ? '...' : ''}`).join("\n");
    }
    // Optional: Process first attached image/PDF via OpenAI Vision (document parsing)
    let extractedData = null;
    if (attachments && attachments.length > 0) {
      try {
        // Only process the first attachment for now
        const imageUrl = attachments[0].url;
        const filePath = imageUrl.split("/").slice(-3).join("/"); // user_id/tripId/filename
        const { data: signedUrlData, error: signedUrlErr } = await supabase.storage.from("chat-attachments").createSignedUrl(filePath, 3600);
        if (signedUrlErr) throw signedUrlErr;
        const accessibleUrl = signedUrlData.signedUrl;
        // Call OpenAI GPT-4 (Vision) to analyze the document image
        const visionRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: OPENAI_MODEL,
            messages: [
              {
                role: "system",
                content: "You are an expert travel document analyzer. Extract structured trip information from the provided image." + "\n\nCLASSIFY the document as one of: hotel, flight, reservation, activity." + "\n\nExtract relevant fields based on type (use JSON keys as specified):" + "\nHOTEL: hotel_name, address, check_in_date, check_out_date, total_cost, currency, confirmation_number" + "\nFLIGHT: airline, departure_city, arrival_city, departure_time, arrival_time, flight_number, total_cost, currency" + "\nRESERVATION: restaurant_name, date, time, party_size, cuisine_type, notes" + "\nACTIVITY: activity_name, date, time, description, cost, currency" + "\n\nRespond ONLY with a JSON object:\n{\n  \"type\": \"hotel|flight|reservation|activity\",\n  \"data\": { ... },\n  \"missingFields\": [...],\n  \"readyToAdd\": boolean\n}\n"
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Please analyze this travel document and extract the data:"
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: accessibleUrl,
                      detail: "high"
                    }
                  }
                ]
              }
            ],
            max_tokens: 1000,
            response_format: {
              type: "json_object"
            }
          })
        });
        if (!visionRes.ok) throw new Error(`OpenAI Vision API error: ${visionRes.status}`);
        const visionJson = await visionRes.json();
        extractedData = JSON.parse(visionJson.choices[0].message.content);
      } catch (visionErr) {
        console.error("Vision analysis failed:", visionErr);
      // Continue without extracted data if vision parsing fails
      }
    }
    // Construct a concise system prompt to avoid token limits
    const basePrompt = `You are a sophisticated travel assistant for WanderLuxe, a luxury travel planning platform. You speak with the polished, warm tone of a high-end concierge and ONLY assist with travel-related topics.

IMPORTANT: If asked about non-travel topics, respond: "I'm your travel assistant and can only help with travel-related questions about your trip. Is there anything about your travel plans I can assist you with?"

CURRENT TRIP CONTEXT:
${tripContext.substring(0, 1500)}${tripContext.length > 1500 ? '...' : ''}

${conversationHistory ? `Recent conversation:\n${conversationHistory}\n\n` : ""}INSTRUCTIONS:
- Use the trip's accommodation as the primary reference point for recommendations
- Tailor advice to the trip's budget level (${budgetLevel})
- Ask clarifying questions when details are vague
- Offer proactive suggestions for gaps in their plans
- Avoid repeating advice for things already booked
- Be enthusiastic and actionable!`;

    const systemPrompt = basePrompt;
    // Call OpenAI API for conversational completion (GPT-4o-mini model)
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userQuestion
          }
        ],
        max_tokens: 500,
        temperature: 0.2,
        top_p: 0.9
      })
    });
    if (!openaiRes.ok) {
      const errorText = await openaiRes.text();
      console.error(`OpenAI API error ${openaiRes.status}:`, errorText);
      throw new Error(`OpenAI API error: ${openaiRes.status}`);
    }
    // Parse standard JSON response
    const openaiJson = await openaiRes.json();
    const aiBaseMessage = openaiJson.choices?.[0]?.message?.content ?? "I'm sorry, I couldn't generate a response. Please try asking in a different way.";
    // Augment the AI response if we have extracted data from a document
    let finalAiMessage = aiBaseMessage;
    if (extractedData && typeof extractedData === "object") {
      const { type, missingFields, readyToAdd } = extractedData;
      if (readyToAdd) {
        finalAiMessage = `Great! I’ve analyzed your ${type} document and extracted all the important details. Everything looks complete and I'm ready to add it to your itinerary.\n\n${aiBaseMessage}`;
      } else if (missingFields && missingFields.length > 0) {
        finalAiMessage = `I analyzed your ${type} document and got most of the details, but I still need a few more pieces of information:\n\n**Missing information:** ${missingFields.join(", ")}\n\nPlease provide those details so I can add the ${type} to your trip.\n\n${aiBaseMessage}`;
      }
    }
    // Note: Message persistence is handled by the frontend to avoid duplicates
    // Return the AI response to the client
    return jsonResponse({
      success: true,
      aiMessage: {
        role: "ai",
        message: finalAiMessage,
        timestamp: nowIso,
        extractedData: extractedData ?? undefined
      }
    }, {
      status: 200,
      headers: corsHeaders(req)
    });
  } catch (err) {
    const status = toStatusCode(err);
    console.error("chat-ai error:", err);
    return jsonResponse({
      success: false,
      error: err.message,
      timestamp: new Date().toISOString()
    }, {
      status,
      headers: corsHeaders(req)
    });
  }
});
