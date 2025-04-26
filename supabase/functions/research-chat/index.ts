// 1) Import the Deno edge-server helper
import { serve } from "https://deno.land/std@0.201.0/server/mod.ts";

serve(async (req) => {
  // 2) CORS preflight
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
  };
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 3) Extract input
    const { query, tripId } = await req.json();
    if (!query) throw new Error("Missing ‘query’");

    // 4) Read your secret
    const apiKey = Deno.env.get("PERPLEXITY_API_KEY");
    if (!apiKey) throw new Error("PERPLEXITY_API_KEY not set");

    // 5) Call Perplexity (adjust URL & payload to match their API)
    const pRes = await fetch("https://api.perplexity.ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ prompt: query }),
    });
    if (!pRes.ok) {
      const err = await pRes.text();
      throw new Error(`Perplexity error: ${err}`);
    }
    const { answer, suggestions } = await pRes.json();

    // 6) Return JSON
    return new Response(JSON.stringify({ answer, suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
