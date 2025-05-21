import { WeatherDayDTO } from '@/types/Weather';

/**
 * Fetches current weather forecast from OpenWeather API (0-10 days)
 * Uses the One Call 3.0 API for daily forecasts
 * 
 * @param lat Latitude coordinate
 * @param lon Longitude coordinate
 * @param date ISO date string (YYYY-MM-DD)
 * @returns Weather data or null if unavailable
 */
export async function fetchOpenWeather(lat: number, lon: number, date: string): Promise<WeatherDayDTO> {
  try {
    const apiKey = process.env.OPENWEATHER_KEY;
    if (!apiKey) {
      console.error('OpenWeather API key not found');
      throw new Error('OpenWeather API key not found');
    }

    // OpenWeather One Call API endpoint (includes 7 day forecast)
    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=current,minutely,hourly,alerts&units=metric&appid=${apiKey}`;
    
    // Implement retry logic
    const response = await fetchWithRetry(url);
    if (!response.ok) {
      throw new Error(`OpenWeather API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Find the forecast for the requested date
    const targetDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate days from today
    const daysDiff = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < 0 || daysDiff >= data.daily.length) {
      console.warn(`Date ${date} out of range for OpenWeather forecast`);
      return null;
    }
    
    const dayForecast = data.daily[daysDiff];
    
    return {
      isoDate: date,
      source: 'openweather',
      hiC: Math.round(dayForecast.temp.max * 10) / 10,
      loC: Math.round(dayForecast.temp.min * 10) / 10,
      precipMM: dayForecast.rain ? dayForecast.rain : 0,
      icon: dayForecast.weather[0].icon,
      confidence: 'high'
    };
  } catch (error) {
    console.error('Error fetching OpenWeather data:', error);
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