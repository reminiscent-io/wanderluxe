import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  destination: string;
  date: string;
  description?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { destination, date, description } = await req.json() as RequestBody;
    
    console.log('Generating content for:', { destination, date, description });

    const prompt = description 
      ? `Generate a detailed, high-quality travel photo of ${description} in ${destination}.`
      : `Generate a beautiful, high-quality travel photo of ${destination}, focusing on its most iconic and picturesque locations.`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('PERPLEXITY_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful travel assistant that generates detailed descriptions of destinations and activities.'
          },
          {
            role: 'user',
            content: `Generate a brief but engaging description for a trip to ${destination} on ${date}. Include interesting facts and must-see attractions.`
          }
        ],
        temperature: 0.7,
        max_tokens: 150,
      }),
    });

    const data = await response.json();
    console.log('Generated content:', data);

    return new Response(
      JSON.stringify({
        description: data.choices[0].message.content,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})