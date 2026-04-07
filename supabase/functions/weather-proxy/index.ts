import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://wanderluxe.io';
const ALLOWED_ORIGIN_PATTERNS = [/\.replit\.dev(:\d+)?$/, /\.repl\.co(:\d+)?$/, /\.replit\.app(:\d+)?$/];
function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin = (origin && ALLOWED_ORIGIN_PATTERNS.some(p => p.test(origin))) ? origin : ALLOWED_ORIGIN;
  return { 'Access-Control-Allow-Origin': allowOrigin, 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS' };
}

interface DailyForecast {
  date: string;
  tempHigh: number;
  tempLow: number;
  condition: string;
  icon: string;
  description: string;
}

interface ForecastResponse {
  location: string;
  current: {
    temp: number;
    condition: string;
    icon: string;
    description: string;
    localTime: string;
  };
  daily: DailyForecast[];
  cachedAt: string;
}

// Convert Celsius to Fahrenheit
function celsiusToFahrenheit(celsius: number): number {
  return Math.round((celsius * 9/5) + 32);
}

// Normalize location for cache key
function normalizeLocation(location: string): string {
  return location.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Get weather condition category from icon code
function getConditionFromIcon(icon: string): string {
  const code = icon.slice(0, 2);
  const conditions: Record<string, string> = {
    '01': 'clear',
    '02': 'partly-cloudy',
    '03': 'cloudy',
    '04': 'overcast',
    '09': 'rain',
    '10': 'rain',
    '11': 'thunderstorm',
    '13': 'snow',
    '50': 'fog'
  };
  return conditions[code] || 'unknown';
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { destination, mode = 'forecast' } = await req.json();

    if (!destination) {
      return new Response(
        JSON.stringify({ error: "Missing destination parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("OPENWEATHERMAP_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Weather API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    const normalizedLocation = normalizeLocation(destination);

    // Check cache first
    const { data: cached } = await supabase
      .from('weather_cache')
      .select('forecast_data, fetched_at, expires_at')
      .eq('location_normalized', normalizedLocation)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cached) {
      console.log(`Weather cache hit for: ${destination}`);
      return new Response(
        JSON.stringify(cached.forecast_data),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Weather cache miss for: ${destination}, fetching from API`);

    // Geocode destination to get coordinates
    const geoRes = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(destination)}&limit=1&appid=${apiKey}`
    );

    if (!geoRes.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to geocode location" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geoData = await geoRes.json();

    if (!geoData || geoData.length === 0) {
      return new Response(
        JSON.stringify({ error: "Location not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { lat, lon } = geoData[0];

    // Fetch current weather
    const currentRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
    );

    if (!currentRes.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch current weather" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currentWeather = await currentRes.json();

    // Fetch 5-day forecast (3-hour intervals)
    const forecastRes = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
    );

    if (!forecastRes.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch forecast" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const forecastData = await forecastRes.json();

    // Calculate local time
    const utcTime = new Date();
    const localTime = new Date(utcTime.getTime() + currentWeather.timezone * 1000);
    const localTimeString = localTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC'
    });

    // Process forecast into daily summaries
    const dailyMap = new Map<string, { temps: number[]; icons: string[]; descriptions: string[] }>();

    for (const item of forecastData.list) {
      const date = item.dt_txt.split(' ')[0]; // YYYY-MM-DD
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { temps: [], icons: [], descriptions: [] });
      }
      const day = dailyMap.get(date)!;
      day.temps.push(item.main.temp);
      day.icons.push(item.weather[0].icon);
      day.descriptions.push(item.weather[0].description);
    }

    // Convert to daily forecast array
    const daily: DailyForecast[] = [];
    for (const [date, data] of dailyMap) {
      const tempHigh = Math.max(...data.temps);
      const tempLow = Math.min(...data.temps);
      // Get most common icon (mode)
      const iconCounts = data.icons.reduce((acc, icon) => {
        acc[icon] = (acc[icon] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const mostCommonIcon = Object.entries(iconCounts).sort((a, b) => b[1] - a[1])[0][0];
      // Get most common description
      const descCounts = data.descriptions.reduce((acc, desc) => {
        acc[desc] = (acc[desc] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const mostCommonDesc = Object.entries(descCounts).sort((a, b) => b[1] - a[1])[0][0];

      daily.push({
        date,
        tempHigh: celsiusToFahrenheit(tempHigh),
        tempLow: celsiusToFahrenheit(tempLow),
        condition: getConditionFromIcon(mostCommonIcon),
        icon: mostCommonIcon,
        description: mostCommonDesc
      });
    }

    // Build response
    const response: ForecastResponse = {
      location: destination,
      current: {
        temp: celsiusToFahrenheit(currentWeather.main.temp),
        condition: getConditionFromIcon(currentWeather.weather[0].icon),
        icon: currentWeather.weather[0].icon,
        description: currentWeather.weather[0].description,
        localTime: localTimeString
      },
      daily,
      cachedAt: new Date().toISOString()
    };

    // Cache the response (upsert)
    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(); // 6 hours
    await supabase
      .from('weather_cache')
      .upsert({
        location: destination,
        location_normalized: normalizedLocation,
        forecast_data: response,
        fetched_at: new Date().toISOString(),
        expires_at: expiresAt
      }, {
        onConflict: 'location_normalized'
      });

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Weather proxy error:", error);
    return new Response(
      JSON.stringify({ error: "An internal server error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
