import OpenAI from "https://esm.sh/openai@4.38.2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { corsHeaders } from "../_shared/cors.ts";

const openai = new OpenAI({ 
  apiKey: Deno.env.get("OPENAI_API_KEY")! 
});

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_ASSISTANT_ID = Deno.env.get("OPENAI_ASSISTANT_ID")!;

interface ChatRequest {
  threadId?: string;
  message: string;
  files?: Array<{ name: string; url: string; type: string }>;
  tripId: string;
  task?: "parse" | "light" | "research";
}

// Model routing: use GPT-4o-mini for simple tasks, GPT-4o for complex ones
const pickModel = (payload: { hasFile: boolean; task: "parse" | "light" | "research" }) =>
  payload.task === "light" && !payload.hasFile ? "gpt-4o-mini" : "gpt-4o";

// Content filtering for abuse and off-topic content
const isContentFiltered = (message: string): { filtered: boolean; response?: string } => {
  const userQuestion = message.indexOf("User question:") !== -1 
    ? message.slice(message.indexOf("User question:") + "User question:".length).trim()
    : message;

  const abusePattern = /(fuck|bitch|asshole|idiot|stupid|hate|kill|rape|shit|nigger|cunt)/i;
  const offTopicPattern = /(homework|assignment|project|politics|election|stock|investment|money advice|finance|tax|coding|programming)/i;

  if (abusePattern.test(userQuestion)) {
    return {
      filtered: true,
      response: "I'm sorry, I can only continue if we keep our conversation respectful."
    };
  }

  if (offTopicPattern.test(userQuestion)) {
    return {
      filtered: true,
      response: "I'm your travel assistant and can only help with travel-related questions about your trip. Is there anything about your travel plans I can assist you with?"
    };
  }

  return { filtered: false };
};

// API endpoint handlers for OpenAI Assistant Actions
const handleToolCall = async (toolCall: any, userId: string, supabase: any) => {
  const { name, arguments: args } = toolCall.function;
  const parsedArgs = JSON.parse(args);

  switch (name) {
    case "get_schema": {
      // Return database schema information
      const schema = {
        accommodations: {
          fields: ["stay_id", "trip_id", "title", "hotel", "hotel_address", "hotel_checkin_date", "hotel_checkout_date", "checkin_time", "checkout_time", "cost", "currency", "description"],
          required: ["trip_id", "title"]
        },
        day_activities: {
          fields: ["activity_id", "day_id", "trip_id", "title", "description", "time", "cost", "currency", "location", "notes"],
          required: ["day_id", "trip_id", "title"]
        },
        transportation: {
          fields: ["id", "trip_id", "type", "departure_location", "arrival_location", "departure_time", "arrival_time", "cost", "currency", "confirmation_number"],
          required: ["trip_id", "type"]
        },
        reservations: {
          fields: ["reservation_id", "day_id", "trip_id", "restaurant_name", "cuisine_type", "reservation_date", "reservation_time", "party_size", "notes", "cost", "currency"],
          required: ["day_id", "trip_id", "restaurant_name"]
        }
      };
      return { success: true, schema };
    }

    case "search_trips": {
      // Search user's trips
      const { data: trips, error } = await supabase
        .from("trips")
        .select("trip_id, destination, start_date, end_date, cover_image_url")
        .eq("user_id", userId)
        .ilike("destination", `%${parsedArgs.query || ""}%`)
        .limit(10);

      if (error) throw new Error(`Search failed: ${error.message}`);
      return { success: true, trips };
    }

    case "create_event": {
      const { trip_id, type, fields } = parsedArgs;
      
      // Verify trip ownership
      const { data: trip, error: tripError } = await supabase
        .from("trips")
        .select("user_id")
        .eq("trip_id", trip_id)
        .single();

      if (tripError || trip.user_id !== userId) {
        throw new Error("Trip not found or access denied");
      }

      let result;
      switch (type) {
        case "accommodation": {
          const { data, error } = await supabase
            .from("accommodations")
            .insert({
              trip_id,
              title: fields.title || fields.hotel_name || "Hotel Stay",
              hotel: fields.hotel_name,
              hotel_address: fields.address,
              hotel_checkin_date: fields.check_in_date,
              hotel_checkout_date: fields.check_out_date,
              checkin_time: fields.checkin_time,
              checkout_time: fields.checkout_time,
              cost: fields.total_cost,
              currency: fields.currency || "USD",
              description: fields.confirmation_number ? `Confirmation: ${fields.confirmation_number}` : null,
              order_index: 0
            })
            .select()
            .single();

          if (error) throw new Error(`Failed to create accommodation: ${error.message}`);
          result = data;
          break;
        }

        case "transportation": {
          const { data, error } = await supabase
            .from("transportation")
            .insert({
              trip_id,
              type: fields.airline ? "flight" : (fields.type || "flight"),
              departure_location: fields.departure_city,
              arrival_location: fields.arrival_city,
              departure_time: fields.departure_time,
              arrival_time: fields.arrival_time,
              cost: fields.total_cost,
              currency: fields.currency || "USD",
              confirmation_number: fields.flight_number || fields.confirmation_number
            })
            .select()
            .single();

          if (error) throw new Error(`Failed to create transportation: ${error.message}`);
          result = data;
          break;
        }

        case "activity": {
          // Need to get or create trip day first
          const activityDate = fields.date;
          let dayId;

          if (activityDate) {
            const { data: dayData, error: dayError } = await supabase
              .from("trip_days")
              .select("day_id")
              .eq("trip_id", trip_id)
              .eq("date", activityDate)
              .single();

            if (dayError || !dayData) {
              // Create new trip day
              const { data: newDay, error: newDayError } = await supabase
                .from("trip_days")
                .insert({
                  trip_id,
                  date: activityDate,
                  day_number: 1 // Will be adjusted by database triggers
                })
                .select("day_id")
                .single();

              if (newDayError) throw new Error(`Failed to create trip day: ${newDayError.message}`);
              dayId = newDay.day_id;
            } else {
              dayId = dayData.day_id;
            }
          }

          const { data, error } = await supabase
            .from("day_activities")
            .insert({
              day_id: dayId,
              trip_id,
              title: fields.activity_name || fields.title,
              description: fields.description,
              time: fields.time,
              cost: fields.cost,
              currency: fields.currency || "USD",
              location: fields.location
            })
            .select()
            .single();

          if (error) throw new Error(`Failed to create activity: ${error.message}`);
          result = data;
          break;
        }

        case "reservation": {
          // Get or create trip day for reservation
          const reservationDate = fields.date;
          let dayId;

          if (reservationDate) {
            const { data: dayData, error: dayError } = await supabase
              .from("trip_days")
              .select("day_id")
              .eq("trip_id", trip_id)
              .eq("date", reservationDate)
              .single();

            if (dayError || !dayData) {
              const { data: newDay, error: newDayError } = await supabase
                .from("trip_days")
                .insert({
                  trip_id,
                  date: reservationDate,
                  day_number: 1
                })
                .select("day_id")
                .single();

              if (newDayError) throw new Error(`Failed to create trip day: ${newDayError.message}`);
              dayId = newDay.day_id;
            } else {
              dayId = dayData.day_id;
            }
          }

          const { data, error } = await supabase
            .from("reservations")
            .insert({
              day_id: dayId,
              trip_id,
              restaurant_name: fields.restaurant_name,
              cuisine_type: fields.cuisine_type,
              reservation_date: reservationDate,
              reservation_time: fields.time,
              party_size: fields.party_size,
              notes: fields.notes,
              cost: fields.cost,
              currency: fields.currency || "USD"
            })
            .select()
            .single();

          if (error) throw new Error(`Failed to create reservation: ${error.message}`);
          result = data;
          break;
        }

        default:
          throw new Error(`Unknown event type: ${type}`);
      }

      return { success: true, event: result };
    }

    case "update_event": {
      const { type, event_id, patch } = parsedArgs;
      
      let result;
      switch (type) {
        case "accommodation": {
          const { data, error } = await supabase
            .from("accommodations")
            .update(patch)
            .eq("stay_id", event_id)
            .select()
            .single();

          if (error) throw new Error(`Failed to update accommodation: ${error.message}`);
          result = data;
          break;
        }

        case "transportation": {
          const { data, error } = await supabase
            .from("transportation")
            .update(patch)
            .eq("id", event_id)
            .select()
            .single();

          if (error) throw new Error(`Failed to update transportation: ${error.message}`);
          result = data;
          break;
        }

        case "activity": {
          const { data, error } = await supabase
            .from("day_activities")
            .update(patch)
            .eq("activity_id", event_id)
            .select()
            .single();

          if (error) throw new Error(`Failed to update activity: ${error.message}`);
          result = data;
          break;
        }

        case "reservation": {
          const { data, error } = await supabase
            .from("reservations")
            .update(patch)
            .eq("reservation_id", event_id)
            .select()
            .single();

          if (error) throw new Error(`Failed to update reservation: ${error.message}`);
          result = data;
          break;
        }

        default:
          throw new Error(`Unknown event type: ${type}`);
      }

      return { success: true, event: result };
    }

    default:
      return { error: "Unknown tool" };
  }
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: req.headers.get("Authorization") ?? ""
        }
      }
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { threadId, message, files, tripId, task }: ChatRequest = await req.json();

    // Content filtering
    const filterResult = isContentFiltered(message);
    if (filterResult.filtered) {
      return new Response(
        JSON.stringify({
          success: true,
          aiMessage: {
            role: "assistant",
            content: filterResult.response,
            timestamp: new Date().toISOString()
          }
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        }
      );
    }

    // Verify trip access
    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .select("trip_id, user_id, destination, start_date, end_date")
      .eq("trip_id", tripId)
      .single();

    if (tripError || !trip) {
      throw new Error("Trip not found or access denied");
    }

    const ownsTrip = trip.user_id === user.id;
    if (!ownsTrip) {
      const { data: share } = await supabase
        .from("trip_shares")
        .select("id")
        .eq("trip_id", tripId)
        .eq("shared_with_user_id", user.id)
        .single();
      
      if (!share) {
        throw new Error("Access denied to this trip");
      }
    }

    // Get trip context for assistant instructions
    const [
      { data: accommodations },
      { data: activities },
      { data: reservations },
      { data: transportation },
      { data: tripDays }
    ] = await Promise.all([
      supabase.from("accommodations").select("*").eq("trip_id", tripId),
      supabase.from("day_activities").select("*").eq("trip_id", tripId),
      supabase.from("reservations").select("*").eq("trip_id", tripId),
      supabase.from("transportation").select("*").eq("trip_id", tripId),
      supabase.from("trip_days").select("*").eq("trip_id", tripId).order("day_number")
    ]);

    // Build trip context
    const tripContext = `
CURRENT TRIP CONTEXT:
- Destination: ${trip.destination}
- Dates: ${trip.start_date} to ${trip.end_date}
- Trip Days: ${tripDays?.length || 0} days planned

ACCOMMODATIONS: ${accommodations?.length ? accommodations.map(acc => 
  `${acc.hotel || acc.title} (${acc.hotel_address || 'Address TBD'}) - ${acc.hotel_checkin_date} to ${acc.hotel_checkout_date}`
).join(', ') : 'None yet'}

ACTIVITIES: ${activities?.length ? activities.map(act => 
  `${act.title} - ${act.time || 'Time TBD'}`
).join(', ') : 'None yet'}

DINING: ${reservations?.length ? reservations.map(res => 
  `${res.restaurant_name} (${res.cuisine_type}) - ${res.reservation_time}, Party of ${res.party_size}`
).join(', ') : 'None yet'}

TRANSPORTATION: ${transportation?.length ? transportation.map(trans => 
  `${trans.type}: ${trans.departure_location} → ${trans.arrival_location}`
).join(', ') : 'None yet'}
`;

    // Create or get thread
    const thread = threadId 
      ? { id: threadId }
      : await openai.beta.threads.create();

    // Handle file uploads if any
    let fileIds: string[] = [];
    if (files && files.length > 0) {
      for (const file of files) {
        try {
          // For Supabase storage files, we'll pass the URL in the message content
          // OpenAI Assistant will handle the file processing
          console.log(`Processing file: ${file.name} (${file.type})`);
        } catch (error) {
          console.error(`Failed to process file ${file.name}:`, error);
        }
      }
    }

    // Add user message to thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: files && files.length > 0 
        ? `${message}\n\nAttached files: ${files.map(f => f.url).join(', ')}`
        : message,
      attachments: fileIds.map(id => ({ file_id: id, tools: [{ type: "code_interpreter" }] }))
    });

    // Determine model based on task complexity
    const model = pickModel({ 
      hasFile: (files?.length || 0) > 0, 
      task: task || "parse" 
    });

    // Run assistant with trip context
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: OPENAI_ASSISTANT_ID,
      model,
      additional_instructions: `Current trip context: ${tripContext}\n\nUser ID: ${user.id}\nTrip ID: ${tripId}`
    });

    // Handle tool calls loop
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    
    while (runStatus.status === "requires_action") {
      const toolCalls = runStatus.required_action!.submit_tool_outputs.tool_calls;
      
      const outputs = await Promise.all(
        toolCalls.map(async (toolCall) => {
          try {
            const result = await handleToolCall(toolCall, user.id, supabase);
            return {
              tool_call_id: toolCall.id,
              output: JSON.stringify(result)
            };
          } catch (error) {
            return {
              tool_call_id: toolCall.id,
              output: JSON.stringify({ error: error.message })
            };
          }
        })
      );

      await openai.beta.threads.runs.submitToolOutputs(thread.id, run.id, {
        tool_outputs: outputs
      });

      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    // Get the latest messages
    const messages = await openai.beta.threads.messages.list(thread.id, {
      order: "desc",
      limit: 1
    });

    const assistantMessage = messages.data[0];
    const content = assistantMessage.content[0];

    let responseText = "";
    if (content.type === "text") {
      responseText = content.text.value;
    }

    // Store conversation in database
    await Promise.all([
      supabase.from("chat_logs").insert({
        trip_id: tripId,
        user_id: user.id,
        role: "user",
        message: message,
        timestamp: new Date().toISOString()
      }),
      supabase.from("chat_logs").insert({
        trip_id: tripId,
        user_id: user.id,
        role: "assistant",
        message: responseText,
        timestamp: new Date().toISOString()
      })
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        threadId: thread.id,
        aiMessage: {
          role: "assistant",
          content: responseText,
          timestamp: new Date().toISOString()
        }
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error) {
    console.error("Chat assistant error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});