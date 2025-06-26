// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.210.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&no-check";

const SUPABASE_URL   = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY   = Deno.env.get("SUPABASE_ANON_KEY")!;
const OPENAI_KEY     = Deno.env.get("OPENAI_API_KEY")!;
const PERPLEXITY_KEY = Deno.env.get("PERPLEXITY_API_KEY")!;
const OPENAI_MODEL   = "gpt-4o";

serve(async req => {
  /* ------------- CORS pre-flight */
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Authorization,Content-Type",
      },
    });
  }

  /* ------------- detect SSE */
  const wantsStream = (req.headers.get("accept") ?? "")
    .toLowerCase()
    .includes("text/event-stream");           // ✅ inclusive check

  try {
    const { message = "", tripId, attachments = [] } = await req.json();
    if (!tripId) throw new Error("tripId required");

    /* ------------- Supabase client */
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    /* ------------- OPTIONAL: attachment vision (omitted for brevity) */
    const extractedResults: unknown[] = [];

    /* ------------- Perplexity streaming call */
    const perpRes = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${PERPLEXITY_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online",
        messages: [
          { role: "system", content: "You are WanderLuxe travel assistant." },
          { role: "user", content: message },
        ],
        stream: wantsStream,
      }),
    });

    /* ---------- fallback: non-SSE JSON response */
    if (!wantsStream) {
      const j = await perpRes.json();
      const aiMsg = j.choices[0].message.content;
      await persist(supabase, tripId, user.id, message, aiMsg, extractedResults);
      return respondJSON({ aiMessage: aiMsg, extracted: extractedResults });
    }

    /* ---------- SSE response */
    const reader = perpRes.body!.getReader();
    const stream = new ReadableStream({
      async start(controller) {
        const enc = (str: string, evt = "chunk") =>
          controller.enqueue(`event:${evt}\ndata:${str}\n\n`);
        const decoder = new TextDecoder();
        let full = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const txt = decoder.decode(value);
          full += txt;
          enc(txt);
        }

        await persist(supabase, tripId, user.id, message, full, extractedResults);
        enc(JSON.stringify({
          id: crypto.randomUUID(),
          role: "ai",
          message: full,
          timestamp: new Date().toISOString(),
          extractedData: extractedResults,
        }), "eom");

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error(err);
    return respondJSON({ error: (err as Error).message }, 400);
  }
});

/* ---------- helpers */
async function persist(
  supabase: any,
  tripId: string,
  userId: string,
  userMsg: string,
  aiMsg: string,
  extracted: unknown,
) {
  const now = new Date().toISOString();
  await supabase.from("chat_logs").insert([
    { id: crypto.randomUUID(), trip_id: tripId, user_id: userId, role: "user", message: userMsg, timestamp: now },
    { id: crypto.randomUUID(), trip_id: tripId, user_id: userId, role: "ai",   message: aiMsg,  timestamp: now, extracted_data: extracted },
  ]);
}

function respondJSON(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}
