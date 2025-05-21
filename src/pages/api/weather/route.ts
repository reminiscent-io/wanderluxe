import { NextApiRequest, NextApiResponse } from 'next';
import { WeatherDayDTO, WeatherResponse } from '@/types/Weather';
import { getOrSetWeather } from '@/lib/cacheWeather';

interface WeatherRequestBody {
  days: {
    day_id: string;
    date: string;
    latitude?: number;
    longitude?: number;
  }[];
}

export const config = {
  runtime: 'edge',
};

/**
 * API route to fetch weather data for multiple trip days
 * 
 * Accepts a POST request with an array of trip days, each containing:
 * - date: ISO date string (YYYY-MM-DD)
 * - latitude: GPS latitude
 * - longitude: GPS longitude
 * 
 * Returns a map of weather data keyed by date
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body: WeatherRequestBody;
    try {
      body = await req.json() as WeatherRequestBody;
    } catch (error) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const { days } = body;

    if (!days || !Array.isArray(days)) {
      return res.status(400).json({ error: 'Missing or invalid days array' });
    }

    // Initialize response object
    const weatherResponse: WeatherResponse = {};

    // Process each day and fetch weather data
    const weatherPromises = days.map(async (day) => {
      const { date, latitude, longitude } = day;

      // Skip if missing required data
      if (!date || !latitude || !longitude) {
        weatherResponse[date] = null;
        return;
      }

      try {
        // Fetch weather data (with caching)
        const weatherData = await getOrSetWeather(latitude, longitude, date);
        weatherResponse[date] = weatherData;
      } catch (error) {
        console.error(`Error fetching weather for ${date}:`, error);
        weatherResponse[date] = null;
      }
    });

    // Wait for all weather data to be fetched
    await Promise.all(weatherPromises);

    // Return the weather data
    return res.status(200).json(weatherResponse);
  } catch (error) {
    console.error('Weather API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}