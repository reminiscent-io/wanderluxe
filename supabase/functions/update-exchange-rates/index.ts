import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Handle CORS preflight requests
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch exchange rates from an API (using exchangerate-api.com as an example)
    const response = await fetch('https://v6.exchangerate-api.com/v6/YOUR_API_KEY/latest/USD')
    const data = await response.json()

    const rates = data.conversion_rates
    const currencies = Object.keys(rates)

    // Update exchange rates in the database
    for (const fromCurrency of currencies) {
      for (const toCurrency of currencies) {
        if (fromCurrency !== toCurrency) {
          const rate = rates[toCurrency] / rates[fromCurrency]
          
          await supabaseClient
            .from('exchange_rates')
            .upsert({
              currency_from: fromCurrency,
              currency_to: toCurrency,
              rate: rate,
              last_updated: new Date().toISOString()
            }, {
              onConflict: 'currency_from,currency_to'
            })
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})