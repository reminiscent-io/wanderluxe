import { serve } from "https://deno.land/std@0.210.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&no-check";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY")!;

serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const payload = await req.json();            // row data passed by trigger
  const { trip_id, role, message } = payload.record;

  const { data: prev } = await supabase
    .from('chat_memory')
    .select('summary')
    .eq('trip_id', trip_id)
    .single();

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `Compress the memory to ≤300 tokens.` },
        { role: "user", content: `Previous memory:\n${prev?.summary ?? '(none)'}\n\nNew line:\n${role}: ${message}` },
      ],
    }),
  });
  const json = await res.json();
  const summary = json.choices[0].message.content;

  await supabase.from('chat_memory').upsert({ trip_id, summary });
  return new Response('ok');
});
