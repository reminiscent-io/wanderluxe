import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { destination } = await req.json();

    if (!destination) {
      return new Response(
        JSON.stringify({ error: "Missing destination parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("OPENWEATHERMAP_API_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Weather API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
    const weatherRes = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`
    );

    if (!weatherRes.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch weather data" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const weather = await weatherRes.json();

    // Calculate local time from timezone offset
    const utcTime = new Date();
    const localTime = new Date(utcTime.getTime() + weather.timezone * 1000);
    const localTimeString = localTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC'
    });

    return new Response(
      JSON.stringify({
        temp: Math.round(weather.main.temp),
        tempF: Math.round((weather.main.temp * 9/5) + 32),
        description: weather.weather[0].description,
        icon: weather.weather[0].icon,
        timezone: weather.timezone,
        localTime: localTimeString,
        humidity: weather.main.humidity,
        windSpeed: Math.round(weather.wind.speed * 3.6), // Convert m/s to km/h
      }),
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
