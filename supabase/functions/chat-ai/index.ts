// chat-ai/index.ts  – Supabase Edge Function (fully patched)

/* ------------------------------------------------
 *  Imports
 * ------------------------------------------------*/
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&no-check";

/* ------------------------------------------------
 *  CORS
 * ------------------------------------------------*/
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/* ------------------------------------------------
 *  Luxury-hotel detector
 * ------------------------------------------------*/
const luxuryHotelRegex = new RegExp(
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

/* ------------------------------------------------
 *  Edge-function handler
 * ------------------------------------------------*/
serve(async (req) => {
  /* ---------- CORS pre-flight ---------- */
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    /* ---------- Supabase client ---------- */
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
      },
    );

    /* ---------- Auth ---------- */
    const { data: { user }, error: userError } =
      await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    /* ---------- Body validation ---------- */
    let body;
    try {
      body = await req.json();
    } catch {
      throw new Error("Invalid JSON in request body");
    }

    const { message, tripId, attachments } = body;
    if (!message || typeof message !== "string" || !message.trim()) {
      throw new Error("Message is required and must be a non-empty string");
    }
    if (!tripId || typeof tripId !== "string") {
      throw new Error("TripId is required and must be a string");
    }

    /* ---------- Trip access check ---------- */
    const { data: tripData, error: tripError } = await supabaseClient
      .from("trips")
      .select(`
        trip_id,
        destination,
        arrival_date,
        departure_date,
        user_id,
        cover_image_url
      `)
      .eq("trip_id", tripId)
      .single();

    if (tripError || !tripData) throw new Error("Trip not found or access denied");

    const ownsTrip = tripData.user_id === user.id;
    if (!ownsTrip) {
      const { data: shareData } = await supabaseClient
        .from("trip_shares")
        .select("id")
        .eq("trip_id", tripId)
        .eq("shared_by_user_id", user.id)
        .single();
      if (!shareData) throw new Error("Access denied to this trip");
    }

    /* ---------- Parallel trip fetches ---------- */
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
      supabaseClient
        .from("chat_logs")
        .select("role, message")
        .eq("trip_id", tripId)
        .order("timestamp", { ascending: false })
        .limit(10),

      supabaseClient
        .from("accommodations")
        .select(
          "hotel, hotel_address, initial_accommodation_day, final_accommodation_day, cost, currency",
        )
        .eq("trip_id", tripId),

      supabaseClient
        .from("day_activities")
        .select("title, description, time, cost, currency")
        .eq("trip_id", tripId),

      supabaseClient
        .from("reservations")
        .select(
          "restaurant_name, cuisine_type, reservation_time, party_size, notes",
        )
        .eq("trip_id", tripId),

      supabaseClient
        .from("transportation")
        .select(
          "type, departure_location, arrival_location, departure_time, arrival_time, cost, currency",
        )
        .eq("trip_id", tripId),

      supabaseClient
        .from("expenses")
        .select("description, cost, currency, expense_type")
        .eq("trip_id", tripId),

      supabaseClient
        .from("vision_board_items")
        .select("title, description, category, image_url")
        .eq("trip_id", tripId),

      supabaseClient
        .from("trip_days")
        .select("date, day_number")
        .eq("trip_id", tripId)
        .order("day_number", { ascending: true }),
    ]);

    /* ---------- Budget + location logic ---------- */
    const primaryHotel = accommodations?.[0];
    let locationContext = tripData.destination;
    let budgetLevel = "mid-range";

    if (primaryHotel) {
      locationContext = primaryHotel.hotel_address || tripData.destination;

      if (
        primaryHotel.cost &&
        primaryHotel.initial_accommodation_day &&
        primaryHotel.final_accommodation_day
      ) {
        const nights =
          (new Date(primaryHotel.final_accommodation_day).valueOf() -
            new Date(primaryHotel.initial_accommodation_day).valueOf()) /
            (1000 * 60 * 60 * 24) || 1;
        const nightly = primaryHotel.cost / nights;

        if (nightly > 400) budgetLevel = "luxury";
        else if (nightly > 200) budgetLevel = "upscale";
        else if (nightly < 100) budgetLevel = "budget-conscious";
      }

      if (luxuryHotelRegex.test(primaryHotel.hotel)) budgetLevel = "luxury";
    }

    /* ---------- Trip context string ---------- */
    const tripContext = `
TRIP OVERVIEW:
- Trip Title/Theme: ${tripData.destination}
- Primary Location: ${locationContext}
- Arrival Date: ${tripData.arrival_date || "Not set"}
- Departure Date: ${tripData.departure_date || "Not set"}
- Duration: ${tripDays?.length || 0} days
- Budget Level: ${budgetLevel}

PRIMARY ACCOMMODATION:${primaryHotel ? `
- Hotel: ${primaryHotel.hotel}
- Location: ${primaryHotel.hotel_address}
- Dates: ${primaryHotel.initial_accommodation_day} to ${primaryHotel.final_accommodation_day}
- Cost: ${primaryHotel.cost} ${primaryHotel.currency}
- Budget Category: ${budgetLevel}` : "\n- No primary accommodation set"}

OTHER ACCOMMODATIONS:${accommodations?.length > 1
      ? accommodations
          .slice(1)
          .map((acc) => `
  - ${acc.hotel} (${acc.hotel_address})
    Dates: ${acc.initial_accommodation_day} to ${acc.final_accommodation_day}
    Cost: ${acc.cost} ${acc.currency}`)
          .join("")
      : "\n  - None"}

EXISTING RESTAURANT RESERVATIONS:${reservations?.length
      ? reservations
          .map((res) => `
  - ${res.restaurant_name} (${res.cuisine_type})
    Time: ${res.reservation_time}, Party: ${res.party_size}
    ${res.notes ? `Notes: ${res.notes}` : ""}`)
          .join("")
      : "\n  - No restaurant reservations yet"}

PLANNED ACTIVITIES:${activities?.length
      ? activities
          .map((act) => `
  - ${act.title}: ${act.description}
    ${act.time ? `Time: ${act.time}` : ""}
    ${act.cost ? `Cost: ${act.cost} ${act.currency}` : ""}`)
          .join("")
      : "\n  - No activities planned yet"}

TRANSPORTATION:${transportation?.length
      ? transportation
          .map((t) => `
  - ${t.type}: ${t.departure_location} → ${t.arrival_location}
    Departure: ${t.departure_time}, Arrival: ${t.arrival_time}
    ${t.cost ? `Cost: ${t.cost} ${t.currency}` : ""}`)
          .join("")
      : "\n  - No transportation booked yet"}

BUDGET/EXPENSES:${expenses?.length
      ? expenses
          .map((e) => `
  - ${e.description}: ${e.cost} ${e.currency} (${e.expense_type})`)
          .join("")
      : "\n  - No expenses tracked yet"}

USER INTERESTS/VISION BOARD:${visionBoard?.length
      ? visionBoard
          .map((v) => `
  - ${v.title} (${v.category}): ${v.description}`)
          .join("")
      : "\n  - No preferences specified yet"}

TRIP DAYS:${tripDays?.length
      ? tripDays.map((d) => `
  - Day ${d.day_number}: ${d.date}`).join("")
      : "\n  - No daily structure set"}
`;

    /* ---------- Chat-history string ---------- */
    const conversationHistory =
      chatHistory?.reverse().map((m) => `${m.role}: ${m.message}`).join("\n") ||
      "";

    /* ---------- OpenAI Vision Analysis for Receipts ---------- */
    let extractedData = null;
    if (attachments && attachments.length > 0) {
      try {
        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
            messages: [
              {
                role: "system",
                content: `You are an expert receipt and document analyzer for a travel planning app. Analyze the uploaded image and extract structured data for travel items.

CLASSIFY the document as one of: hotel, flight, reservation, activity

Extract relevant data based on type:

HOTEL:
- hotel_name (required)
- address (required) 
- check_in_date (required, format: YYYY-MM-DD)
- check_out_date (required, format: YYYY-MM-DD)
- total_cost (number)
- currency (default: USD)
- confirmation_number

FLIGHT:
- airline (required)
- departure_city (required)
- arrival_city (required) 
- departure_time (required, format: YYYY-MM-DD HH:MM)
- arrival_time (required, format: YYYY-MM-DD HH:MM)
- flight_number
- total_cost (number)
- currency (default: USD)

RESERVATION:
- restaurant_name (required)
- date (required, format: YYYY-MM-DD)
- time (required, format: HH:MM)
- party_size (number)
- cuisine_type
- notes

ACTIVITY:
- activity_name (required)
- date (required, format: YYYY-MM-DD)
- time (format: HH:MM)
- description
- cost (number)
- currency (default: USD)

Respond in JSON format:
{
  "type": "hotel|flight|reservation|activity",
  "data": { extracted fields },
  "missingFields": ["field1", "field2"],
  "readyToAdd": boolean
}

Set readyToAdd to true only if ALL required fields are present.`
              },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Please analyze this receipt and extract the travel data:"
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: attachments[0].url
                    }
                  }
                ]
              }
            ],
            max_tokens: 1000,
            response_format: { type: "json_object" }
          })
        });

        if (!openaiResponse.ok) {
          throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
        }

        const openaiResult = await openaiResponse.json();
        const extractedText = openaiResult.choices[0].message.content;
        extractedData = JSON.parse(extractedText);
        
      } catch (error) {
        console.error("Error analyzing receipt with OpenAI:", error);
        // Continue with regular chat if vision analysis fails
      }
    }

    /* ---------- Perplexity call ---------- */
    const perplexityResponse = await fetch(
      "https://api.perplexity.ai/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("PERPLEXITY_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-sonar-small-128k-online",
          messages: [
            {
              role: "system",
              content: `You are a sophisticated travel assistant for WanderLuxe, a luxury travel planning platform. You ONLY assist with travel-related topics and provide highly personalized recommendations.

SCOPE – You can help with:
- Trip planning, itineraries, and scheduling
- Activities, attractions, and experiences
- Restaurants, dining, and food recommendations
- Transportation (flights, trains, cars, local transit)
- Accommodations and hotels
- Weather and climate information
- Packing and clothing recommendations for destinations
- Local customs, culture, and etiquette
- Currency, tipping, and travel costs
- Safety tips and travel advisories
- Visa requirements and travel documents
- Language basics and communication tips
- Shopping and local markets
- Entertainment and nightlife
- Day trips and excursions
- Travel insurance and health considerations
- Time zones and jet lag management
- Photography spots and travel memories
- Travel apps and tools
- Luggage and travel gear recommendations
- Questions about their current trip bookings, reservations, or plans

IMPORTANT: If a user asks about topics unrelated to travel (e.g. work queries, politics, etc.), respond: "I'm your travel assistant and can only help with travel-related questions about your trip. Is there anything about your travel plans I can assist you with?"

${tripContext}

Previous conversation:
${conversationHistory}

INSTRUCTIONS:
- Use hotel location as your PRIMARY geographic anchor
- Match recommendations to the budget level (${budgetLevel})
- Ask clarifying questions when details are vague
- Avoid redundancy with existing bookings
- Be enthusiastic and actionable!`,
            },
            { role: "user", content: message },
          ],
          max_tokens: 500,
          temperature: 0.7,
          top_p: 0.9,
          stream: false,
        }),
      },
    );

    if (!perplexityResponse.ok) {
      throw new Error(`Perplexity API error: ${perplexityResponse.statusText}`);
    }

    const aiMessage =
      (await perplexityResponse.json()).choices?.[0]?.message?.content ??
      "Sorry, I couldn't generate a response. Please try again.";

    /* ---------- Persist chat ---------- */
    const userMessageId = crypto.randomUUID();
    await supabaseClient.from("chat_logs").insert({
      id: userMessageId,
      trip_id: tripId,
      user_id: user.id,
      role: "user",
      message,
      timestamp: new Date().toISOString(),
    });

    const aiMessageId = crypto.randomUUID();
    await supabaseClient.from("chat_logs").insert({
      id: aiMessageId,
      trip_id: tripId,
      user_id: user.id,
      role: "ai",
      message: aiMessage,
      timestamp: new Date().toISOString(),
    });

    /* ---------- Generate AI response message based on extracted data ---------- */
    let finalAiMessage = aiMessage;
    if (extractedData) {
      const dataType = extractedData.type;
      const missingFields = extractedData.missingFields || [];
      
      if (extractedData.readyToAdd) {
        finalAiMessage = `Great! I've analyzed your ${dataType} receipt and extracted all the necessary information. The data looks complete and ready to add to your itinerary!\n\n${aiMessage}`;
      } else if (missingFields.length > 0) {
        finalAiMessage = `I've analyzed your ${dataType} receipt and extracted most of the information, but I need a few more details:\n\n**Missing information:** ${missingFields.join(', ')}\n\nCould you please provide these details so I can add this ${dataType} to your itinerary?\n\n${aiMessage}`;
      }
    }

    /* ---------- Response to caller ---------- */
    return new Response(
      JSON.stringify({
        success: true,
        userMessage: {
          id: userMessageId,
          role: "user",
          message,
          timestamp: new Date().toISOString(),
          user_id: user.id,
          attachments: attachments || undefined,
        },
        aiMessage: {
          id: aiMessageId,
          role: "ai",
          message: finalAiMessage,
          timestamp: new Date().toISOString(),
          extractedData: extractedData || undefined,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (err) {
    console.error("chat-ai error:", err);

    const status = /Unauthorized/.test(err.message)
      ? 401
      : /access denied/i.test(err.message)
      ? 403
      : /not found/i.test(err.message)
      ? 404
      : /required|Invalid JSON/i.test(err.message)
      ? 400
      : 500;

    return new Response(
      JSON.stringify({
        success: false,
        error: err.message,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status },
    );
  }
});
