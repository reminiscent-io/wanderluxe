// deno-lint-ignore-file
import { serve } from "https://deno.land/std@0.210.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno&no-check";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY")!;

serve(async req => {
  const payload = await req.json();
  const { trip_id, role, message } = payload.record;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: prev } = await admin.from('chat_memory').select('summary').eq('trip_id', trip_id).single();

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Rewrite memory ≤300 tokens." },
        { role: "user", content: `Memory:\n${prev?.summary ?? '(none)'}\nNew:\n${role}: ${message}` },
      ],
      max_tokens: 300,
    }),
  }).then(r => r.json());

  await admin.from('chat_memory').upsert({ trip_id, summary: res.choices[0].message.content });
  return new Response('ok');
});
