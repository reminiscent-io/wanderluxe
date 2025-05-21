import { WeatherDayDTO } from '@/types/Weather';

/**
 * Fetches climate normals from Tomorrow.io API for dates far in the future (>548 days)
 * Uses 30-year averages for the particular day of year
 * 
 * @param lat Latitude coordinate
 * @param lon Longitude coordinate
 * @param date ISO date string (YYYY-MM-DD)
 * @returns Weather data or null if unavailable
 */
export async function fetchClimateNormals(lat: number, lon: number, date: string): Promise<WeatherDayDTO> {
  try {
    const apiKey = process.env.TOMORROW_KEY;
    if (!apiKey) {
      console.error('Tomorrow.io API key not found');
      throw new Error('Tomorrow.io API key not found');
    }

    // Extract month and day from the target date to get climate normals for that day of year
    const targetDate = new Date(date);
    const month = targetDate.getMonth() + 1; // 1-12
    const day = targetDate.getDate(); // 1-31
    
    // Tomorrow.io Climate Normals API endpoint
    const url = `https://api.tomorrow.io/v4/climate/normals?location=${lat},${lon}&apikey=${apiKey}`;
    
    const response = await fetchWithRetry(url);
    if (!response.ok) {
      throw new Error(`Tomorrow.io API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Find the climate normal for the specific day of year
    // This is a simplified approach - actual API response format may vary
    const timelineData = data.timelines.daily;
    
    // Look for the entry matching our month and day
    const matchingEntry = timelineData.find((entry: any) => {
      const entryDate = new Date(entry.time);
      return entryDate.getMonth() + 1 === month && entryDate.getDate() === day;
    });
    
    if (!matchingEntry) {
      console.warn(`Climate data not found for date pattern: ${month}-${day}`);
      return null;
    }
    
    // Extract temperature and precipitation values
    const values = matchingEntry.values;
    
    return {
      isoDate: date,
      source: 'climateNormals',
      hiC: Math.round(values.temperatureMax * 10) / 10,
      loC: Math.round(values.temperatureMin * 10) / 10,
      precipMM: values.precipitationProbability * 0.254, // Convert probability to rough mm estimate
      icon: determineIconFromClimateNormals(values),
      confidence: 'low'
    };
  } catch (error) {
    console.error('Error fetching climate normals data:', error);
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
 * Determines appropriate weather icon based on climate normals data
 */
function determineIconFromClimateNormals(values: any): string {
  // This is a simplified implementation
  // For climate normals, we're dealing with probabilities, not actual conditions
  
  // High precipitation probability suggests rain/storms
  if (values.precipitationProbability > 40) {
    return '10d'; // Rain
  }
  
  // Check cloud coverage if available
  if (values.cloudCover && values.cloudCover > 50) {
    return '03d'; // Cloudy
  }
  
  // If temperature is very low, might be snowy
  if (values.temperatureMin < 0) {
    return '13d'; // Snow
  }
  
  // Default to partly cloudy as a safe assumption for climate normals
  return '02d';
}