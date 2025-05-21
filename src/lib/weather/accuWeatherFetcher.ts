import { WeatherDayDTO } from '@/types/Weather';

/**
 * Fetches extended weather forecast from AccuWeather API (11-45 days)
 * 
 * @param lat Latitude coordinate
 * @param lon Longitude coordinate
 * @param date ISO date string (YYYY-MM-DD)
 * @returns Weather data or null if unavailable
 */
export async function fetchAccuWeather(lat: number, lon: number, date: string): Promise<WeatherDayDTO> {
  try {
    const apiKey = process.env.ACCUWEATHER_KEY;
    if (!apiKey) {
      console.error('AccuWeather API key not found');
      throw new Error('AccuWeather API key not found');
    }

    // First, get the location key for the coordinates
    const locationUrl = `http://dataservice.accuweather.com/locations/v1/cities/geoposition/search?apikey=${apiKey}&q=${lat},${lon}`;
    
    const locationResponse = await fetchWithRetry(locationUrl);
    if (!locationResponse.ok) {
      throw new Error(`AccuWeather location API error: ${locationResponse.status} ${locationResponse.statusText}`);
    }
    
    const locationData = await locationResponse.json();
    const locationKey = locationData.Key;
    
    // Now get the extended forecast
    const forecastUrl = `http://dataservice.accuweather.com/forecasts/v1/daily/45day/${locationKey}?apikey=${apiKey}&metric=true`;
    
    const forecastResponse = await fetchWithRetry(forecastUrl);
    if (!forecastResponse.ok) {
      throw new Error(`AccuWeather forecast API error: ${forecastResponse.status} ${forecastResponse.statusText}`);
    }
    
    const forecastData = await forecastResponse.json();
    
    // Find the forecast for the requested date
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    const forecastDay = forecastData.DailyForecasts.find((day: any) => {
      const forecastDate = new Date(day.Date);
      forecastDate.setHours(0, 0, 0, 0);
      return forecastDate.getTime() === targetDate.getTime();
    });
    
    if (!forecastDay) {
      console.warn(`Date ${date} not found in AccuWeather forecast`);
      return null;
    }
    
    return {
      isoDate: date,
      source: 'accuweather',
      hiC: Math.round(forecastDay.Temperature.Maximum.Value * 10) / 10,
      loC: Math.round(forecastDay.Temperature.Minimum.Value * 10) / 10,
      precipMM: forecastDay.Day.RainProbability * 0.254, // Convert probability to rough mm estimate
      icon: mapAccuWeatherIcon(forecastDay.Day.Icon),
      confidence: 'medium'
    };
  } catch (error) {
    console.error('Error fetching AccuWeather data:', error);
    return null;
  }
}

/**
 * Helper function to retry failed API requests
 */
async function fetchWithRetry(url: string, retries = 3, delay = 1000): Promise<Response> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fetch(url);
    } catch (error) {
      lastError = error as Error;
      console.warn(`Fetch attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      // Exponential backoff
      delay *= 2;
    }
  }
  
  throw lastError;
}

/**
 * Maps AccuWeather icon codes to standardized icon codes
 * This is a simplified mapping - expand as needed
 */
function mapAccuWeatherIcon(iconCode: number): string {
  // Map AccuWeather icon codes to something compatible with OpenWeather
  // This is a simplified mapping
  const iconMap: Record<number, string> = {
    1: '01d', // Sunny
    2: '01d', // Mostly Sunny
    3: '02d', // Partly Sunny
    4: '03d', // Intermittent Clouds
    5: '04d', // Hazy Sunshine
    6: '04d', // Mostly Cloudy
    7: '04d', // Cloudy
    8: '04d', // Dreary
    11: '50d', // Fog
    12: '09d', // Showers
    13: '10d', // Mostly Cloudy with Showers
    14: '10d', // Partly Sunny with Showers
    15: '11d', // Thunderstorms
    16: '11d', // Mostly Cloudy with Thunder Showers
    17: '11d', // Partly Sunny with Thunder Showers
    18: '10d', // Rain
    19: '13d', // Flurries
    20: '13d', // Mostly Cloudy with Flurries
    21: '13d', // Partly Sunny with Flurries
    22: '13d', // Snow
    23: '13d', // Mostly Cloudy with Snow
    24: '09d', // Ice
    25: '09d', // Sleet
    26: '09d', // Freezing Rain
    29: '10d', // Rain and Snow
    30: '01d', // Hot
    31: '01d', // Cold
    32: '50d', // Windy
  };
  
  return iconMap[iconCode] || '01d'; // Default to clear sky if unknown
}