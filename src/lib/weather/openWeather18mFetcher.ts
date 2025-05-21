import { WeatherDayDTO } from '@/types/Weather';

/**
 * Fetches long-term weather forecast from OpenWeather API (46-548 days)
 * Uses the day_summary endpoint for forecasts up to 18 months ahead
 * 
 * @param lat Latitude coordinate
 * @param lon Longitude coordinate
 * @param date ISO date string (YYYY-MM-DD)
 * @returns Weather data or null if unavailable
 */
export async function fetchOpenWeather18m(lat: number, lon: number, date: string): Promise<WeatherDayDTO> {
  try {
    const apiKey = process.env.OPENWEATHER_KEY;
    if (!apiKey) {
      console.error('OpenWeather API key not found');
      throw new Error('OpenWeather API key not found');
    }

    // Calculate timestamp for the target date (start of day in UTC)
    const targetDate = new Date(date);
    const timestamp = Math.floor(targetDate.getTime() / 1000);
    
    // OpenWeather History API endpoint
    const url = `https://api.openweathermap.org/data/3.0/climate/day_summary?lat=${lat}&lon=${lon}&date=${date}&units=metric&appid=${apiKey}`;
    
    const response = await fetchWithRetry(url);
    if (!response.ok) {
      throw new Error(`OpenWeather 18m API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // For 18-month forecasts, we'll use climate data which has different structure
    return {
      isoDate: date,
      source: 'openweather18m',
      hiC: Math.round(data.temperature.max * 10) / 10,
      loC: Math.round(data.temperature.min * 10) / 10,
      precipMM: data.precipitation || 0,
      icon: determineIconFromClimateData(data),
      confidence: 'low'
    };
  } catch (error) {
    console.error('Error fetching OpenWeather 18m data:', error);
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
 * Determines appropriate weather icon based on climate data
 */
function determineIconFromClimateData(data: any): string {
  // This is a simplified implementation - we'd need to examine the climate data structure
  // to create a more accurate mapping
  
  // Check if precipitation data is available
  if (data.precipitation && data.precipitation > 5) {
    return '10d'; // Rain
  }
  
  // Check cloud coverage if available
  if (data.clouds && data.clouds > 50) {
    return '03d'; // Cloudy
  }
  
  // Default to partly cloudy as a safe assumption for long-term forecast
  return '02d';
}