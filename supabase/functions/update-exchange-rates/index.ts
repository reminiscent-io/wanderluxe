import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://wanderluxe.io';
const ALLOWED_ORIGIN_PATTERNS = [/\.replit\.dev(:\d+)?$/, /\.repl\.co(:\d+)?$/, /\.replit\.app(:\d+)?$/];
function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin = (origin && ALLOWED_ORIGIN_PATTERNS.some(p => p.test(origin))) ? origin : ALLOWED_ORIGIN;
  return { 'Access-Control-Allow-Origin': allowOrigin, 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS' };
}

// Currencies the budget UI can display. The client only reads USD-anchored
// rows and pivots through USD for cross pairs, but the table already holds
// direct pairs for these from earlier runs — refresh them too so nothing a
// reader might reach for is left sitting at a months-old rate.
const DISPLAY_CURRENCIES = ['USD', 'EUR', 'JPY', 'GBP', 'AUD', 'CAD', 'MXN', 'CHF'];

const BATCH_SIZE = 500;

type RateRow = {
  currency_from: string;
  currency_to: string;
  rate: number;
  last_updated: string;
};

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
    // Rates are quoted against USD: rates[X] is how many X one USD buys.
    const rates: Record<string, number> = data.conversion_rates;

    // exchange_rates.currency_from/_to are FKs into currencies, and the feed
    // carries a few codes we don't stock. Drop them up front — a single unknown
    // code would otherwise reject the whole batch it lands in.
    const { data: knownCurrencies, error: currencyError } = await supabaseClient
      .from('currencies')
      .select('currency');
    if (currencyError) throw currencyError;
    const known = new Set((knownCurrencies ?? []).map((c: { currency: string }) => c.currency));

    const currencies = Object.keys(rates).filter(
      (c) => known.has(c) && Number.isFinite(rates[c]) && rates[c] > 0
    );
    console.log(`Fetched rates for ${Object.keys(rates).length} currencies, ${currencies.length} known locally`);

    const now = new Date().toISOString();
    const rows = new Map<string, RateRow>();
    const put = (from: string, to: string, rate: number) => {
      if (from === to || !Number.isFinite(rate) || rate <= 0) return;
      rows.set(`${from}|${to}`, { currency_from: from, currency_to: to, rate, last_updated: now });
    };

    // USD-anchored rows in both directions for every currency the feed knows.
    // The previous version tried to write the full N x N matrix one upsert at a
    // time (~26k round trips) and timed out partway through the alphabet, which
    // is why most currencies had no rows at all and conversion silently no-oped.
    for (const currency of currencies) {
      put('USD', currency, rates[currency]);
      put(currency, 'USD', 1 / rates[currency]);
    }

    // Cross matrix for the currencies the picker offers (see note above).
    const displayable = DISPLAY_CURRENCIES.filter((c) => currencies.includes(c));
    for (const from of displayable) {
      for (const to of displayable) {
        put(from, to, rates[to] / rates[from]);
      }
    }

    const payload = [...rows.values()];
    for (let i = 0; i < payload.length; i += BATCH_SIZE) {
      const batch = payload.slice(i, i + BATCH_SIZE);
      const { error } = await supabaseClient.from('exchange_rates').upsert(batch, {
        onConflict: 'currency_from,currency_to'
      });
      if (error) {
        console.error(`Error upserting rate batch at offset ${i}:`, error);
        throw error;
      }
    }

    console.log(`Exchange rates updated successfully (${payload.length} pairs)`);
    return new Response(JSON.stringify({
      success: true,
      pairs: payload.length
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
