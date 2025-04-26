import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  // 1) CORS preflight & headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  };
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 2) Parse body
    const { query, tripId } = await req.json();
    if (!query) throw new Error("Missing ‘query’");

    // 3) Read secret
    const apiKey = Deno.env.get("PERPLEXITY_API_KEY");
    if (!apiKey) throw new Error("PERPLEXITY_API_KEY not set");

    // 4) Call Perplexity
    const pRes = await fetch("https://api.perplexity.ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ prompt: query }),
    });
    if (!pRes.ok) {
      const errText = await pRes.text();
      throw new Error(`Perplexity error: ${errText}`);
    }
    const { answer, suggestions } = await pRes.json();

    // 5) Return
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
