// deno‐deploy edge function
import { serve } from "https://deno.land/std@0.210.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&no-check";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY")!;
const PERPLEXITY_KEY = Deno.env.get("PERPLEXITY_API_KEY")!;
const OPENAI_MODEL = "gpt-4o";

serve(async (req) => {
  const streamMode = req.headers.get("Accept") === "text/event-stream";
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });

  /* ---------- little CORS helper ---------- */
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization,content-type" };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { message, tripId, attachments = [] } = await req.json();
    if (!tripId) throw new Error("tripId required");

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    /* ---------- vision step (parallel) ---------- */
    const extractedResults = await Promise.all(
      attachments.map(async (att: { url: string; name: string }) => {
        try {
          const signed = await supabase.storage.from("chat-attachments")
            .createSignedUrl(att.url.split("/").slice(-3).join("/"), 3600)
            .then(r => r.data.signedUrl);

          const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: OPENAI_MODEL,
              messages: [
                { role: "system", content: "Analyse travel receipt. Respond JSON." },
                { role: "user", content: [
                    { type: "text", text: "Analyse" },
                    { type: "image_url", image_url: { url: signed, detail: "high" } },
                  ] },
              ],
              max_tokens: 1000,
              response_format: { type: "json_object" },
            }),
          });
          const json = await res.json();
          const parsed = JSON.parse(json.choices[0].message.content);

          /* map readyToAdd straight into DB */
          if (parsed.readyToAdd) await mapToTables(parsed, tripId, supabase);

          return { ...parsed, fileName: att.name };
        } catch (e) {
          console.error("vision error", e);
          return { error: e.message, fileName: att.name };
        }
      }),
    );

    /* ---------- build system prompt (summary + trip context) ---------- */
    const { data: memory } = await supabase.from("chat_memory").select("summary").eq("trip_id", tripId).single();
    const tripContext = await buildTripContext(tripId, supabase);

    const promptMessages = [
      { role: "system", content: tripContext + "\n\nMEMORY:\n" + (memory?.summary ?? "(none)") },
      { role: "user", content: message },
    ];

    /* ---------- streaming call to Perplexity ---------- */
    const perplexityRes = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${PERPLEXITY_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "llama-3.1-sonar-small-128k-online", messages: promptMessages, stream: true }),
    });

    if (!streamMode) { /* fallback JSON mode */ }

    /* ---------- SSE response ---------- */
    const stream = new ReadableStream({
      async start(controller) {
        const enc = (data: string, event = "chunk") =>
          controller.enqueue(`event:${event}\ndata:${data}\n\n`);
        const reader = perplexityRes.body!.getReader();
        const decoder = new TextDecoder();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          fullText += chunk;
          enc(chunk); // push incremental piece
        }

        /* persist to chat_logs */
        const now = new Date().toISOString();
        await Promise.all([
          supabase.from("chat_logs").insert({ id: crypto.randomUUID(), trip_id: tripId, user_id: user.id, role: "user", message, timestamp: now }),
          supabase.from("chat_logs").insert({
            id: crypto.randomUUID(),
            trip_id: tripId,
            user_id: user.id,
            role: "ai",
            message: fullText,
            timestamp: now,
            extracted_data: extractedResults,
          }),
        ]);

        enc(JSON.stringify({ id: crypto.randomUUID(), role: "ai", message: fullText, timestamp: now, extractedData: extractedResults }), "eom");
        controller.close();
      },
    });

    return new Response(stream, { headers: { ...cors, "Content-Type": "text/event-stream" } });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 400, headers: cors });
  }
});

/* ---------- helpers ---------- */
async function mapToTables(parsed: any, tripId: string, supabase: any) {
  switch (parsed.type) {
    case "hotel":
      await supabase.from("accommodations").insert({
        trip_id: tripId,
        hotel: parsed.data.hotel_name,
        hotel_address: parsed.data.address,
        initial_accommodation_day: parsed.data.check_in_date,
        final_accommodation_day: parsed.data.check_out_date,
        cost: parsed.data.total_cost,
        currency: parsed.data.currency,
      });
      break;
    case "flight":
      await supabase.from("transportation").insert({
        trip_id: tripId,
        type: "flight",
        departure_location: parsed.data.departure_city,
        arrival_location: parsed.data.arrival_city,
        departure_time: parsed.data.departure_time,
        arrival_time: parsed.data.arrival_time,
        cost: parsed.data.total_cost,
        currency: parsed.data.currency,
      });
      break;
    // add reservation, activity …
  }
}

async function buildTripContext(tripId: string, supabase: any) {
  const { data: trip } = await supabase.from("trips").select("*").eq("trip_id", tripId).single();
  return `TRIP:${trip.destination} (${trip.arrival_date}→${trip.departure_date})`;
}
