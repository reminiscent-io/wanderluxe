import { WeatherDayDTO } from '@/types/Weather';
import { chooseWeatherSource } from './chooseWeatherSource';
import { fetchOpenWeather } from './weather/openWeatherFetcher';
import { fetchAccuWeather } from './weather/accuWeatherFetcher';
import { fetchOpenWeather18m } from './weather/openWeather18mFetcher';
import { fetchClimateNormals } from './weather/climateNormalsFetcher';

// Redis client
let redis: any;

// Initialize Redis client (only if in server environment)
async function initRedis() {
  if (typeof window === 'undefined' && !redis) {
    const { createClient } = await import('@upstash/redis');
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      console.error('Redis URL not found in environment variables');
      return null;
    }
    
    try {
      redis = createClient({ url: redisUrl });
      await redis.connect();
      return redis;
    } catch (error) {
      console.error('Failed to initialize Redis client:', error);
      return null;
    }
  }
  
  return redis;
}

/**
 * Generate cache key for weather data
 */
function getCacheKey(isoDate: string, lat: number, lon: number): string {
  return `weather:${isoDate}:${lat}:${lon}`;
}

/**
 * Determine appropriate TTL (time-to-live) for cached weather data
 */
function getCacheTTL(source: string): number {
  // TTL in seconds
  switch (source) {
    case 'openweather':
    case 'accuweather':
      return 3 * 60 * 60; // 3 hours
    case 'openweather18m':
    case 'climateNormals':
      return 24 * 60 * 60; // 24 hours
    default:
      return 60 * 60; // 1 hour default
  }
}

/**
 * Get cached weather data or fetch and cache fresh data
 */
export async function getOrSetWeather(
  lat: number,
  lon: number,
  isoDate: string
): Promise<WeatherDayDTO> {
  // Initialize Redis client
  const client = await initRedis();
  if (!client) {
    console.warn('Redis unavailable, skipping cache');
    return fetchWeatherData(lat, lon, isoDate);
  }
  
  const cacheKey = getCacheKey(isoDate, lat, lon);
  
  try {
    // Try to get from cache first
    const cachedData = await client.get(cacheKey);
    if (cachedData) {
      console.log(`Cache hit for ${cacheKey}`);
      return JSON.parse(cachedData);
    }
    
    // If not in cache, fetch fresh data
    console.log(`Cache miss for ${cacheKey}, fetching fresh data`);
    const weatherData = await fetchWeatherData(lat, lon, isoDate);
    
    // Only cache if we actually got data
    if (weatherData) {
      const ttl = getCacheTTL(weatherData.source);
      await client.set(cacheKey, JSON.stringify(weatherData), { ex: ttl });
      console.log(`Cached data for ${cacheKey} with TTL ${ttl} seconds`);
    }
    
    return weatherData;
  } catch (error) {
    console.error('Error in getOrSetWeather:', error);
    // Fall back to direct fetch on cache error
    return fetchWeatherData(lat, lon, isoDate);
  }
}

/**
 * Fetch weather data from the appropriate source based on date
 */
async function fetchWeatherData(
  lat: number,
  lon: number,
  isoDate: string
): Promise<WeatherDayDTO> {
  const date = new Date(isoDate);
  const source = chooseWeatherSource(date);
  
  // If source is 'none' (past date), return null
  if (source === 'none') {
    return null;
  }
  
  // Call the appropriate fetcher based on source
  switch (source) {
    case 'openweather':
      return fetchOpenWeather(lat, lon, isoDate);
    case 'accuweather':
      return fetchAccuWeather(lat, lon, isoDate);
    case 'openweather18m':
      return fetchOpenWeather18m(lat, lon, isoDate);
    case 'climateNormals':
      return fetchClimateNormals(lat, lon, isoDate);
    default:
      console.error(`Unknown weather source: ${source}`);
      return null;
  }
}