import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://wanderluxe.io';
const ALLOWED_ORIGIN_PATTERNS = [/\.replit\.dev(:\d+)?$/, /\.repl\.co(:\d+)?$/, /\.replit\.app(:\d+)?$/];
function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin = (origin && ALLOWED_ORIGIN_PATTERNS.some(p => p.test(origin))) ? origin : ALLOWED_ORIGIN;
  return { 'Access-Control-Allow-Origin': allowOrigin, 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS' };
}
// Handle CORS preflight requests
Deno.serve(async (req)=>{
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    // Require cron secret or service role key for authorization
    const authHeader = req.headers.get('Authorization');
    const cronSecret = Deno.env.get('CRON_SECRET');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const token = authHeader?.replace('Bearer ', '');
    if (!token || (token !== cronSecret && token !== serviceRoleKey)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      });
    }
    // Initialize Supabase client
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    // Fetch exchange rates from an API (using exchangerate-api.com as an example)
    const response = await fetch(`https://v6.exchangerate-api.com/v6/${Deno.env.get('EXCHANGE_RATE_API')}/latest/USD`);
    const data = await response.json();
    if (!data.conversion_rates) {
      throw new Error('Failed to fetch exchange rates');
    }
    const rates = data.conversion_rates;
    const currencies = Object.keys(rates);
    console.log(`Fetched rates for ${currencies.length} currencies`);
    // Update exchange rates in the database
    for (const fromCurrency of currencies){
      for (const toCurrency of currencies){
        if (fromCurrency !== toCurrency) {
          const rate = rates[toCurrency] / rates[fromCurrency];
          const { error } = await supabaseClient.from('exchange_rates').upsert({
            currency_from: fromCurrency,
            currency_to: toCurrency,
            rate: rate,
            last_updated: new Date().toISOString()
          }, {
            onConflict: 'currency_from,currency_to'
          });
          if (error) {
            console.error(`Error updating rate for ${fromCurrency} to ${toCurrency}:`, error);
          }
        }
      }
    }
    console.log('Exchange rates updated successfully');
    return new Response(JSON.stringify({
      success: true
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
