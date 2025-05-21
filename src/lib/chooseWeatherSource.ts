import { differenceInCalendarDays } from 'date-fns';
import { WeatherSource } from '@/types/Weather';

/**
 * Determines the appropriate weather data source based on how far in the future the date is
 * 
 * Source Selection Rules:
 * - Past dates: none (return null)
 * - 0-10 days: OpenWeather One-Call 3.0 daily (free tier)
 * - 11-45 days: AccuWeather 45-Day (paid key)
 * - 46-548 days: OpenWeather day_summary (up to 18 months ahead)
 * - >548 days: Tomorrow.io Climate Normals (30-year averages)
 * 
 * @param date The date to get weather data for
 * @returns The appropriate data source to use
 */
export function chooseWeatherSource(date: Date): WeatherSource {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day
  
  const dayDifference = differenceInCalendarDays(date, today);
  
  // Past dates
  if (dayDifference < 0) {
    return 'none';
  }
  
  // 0-10 days: Use OpenWeather current forecast
  if (dayDifference <= 10) {
    return 'openweather';
  }
  
  // 11-45 days: Use AccuWeather extended forecast
  if (dayDifference <= 45) {
    return 'accuweather';
  }
  
  // 46-548 days (18 months): Use OpenWeather 18 month forecast
  if (dayDifference <= 548) {
    return 'openweather18m';
  }
  
  // Beyond 548 days: Use climate normals
  return 'climateNormals';
}