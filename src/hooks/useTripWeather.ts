import { useCallback } from 'react';
import useSWRImmutable from 'swr/immutable';
import { WeatherDayDTO, WeatherResponse } from '@/types/Weather';
import { TripDay } from '@/types/trip';

interface TripDayWithLocation {
  day_id: string;
  date: string;
  latitude: number;
  longitude: number;
}

/**
 * Custom hook to fetch weather data for trip days
 * 
 * @param days Array of trip days to fetch weather for, including location data
 * @returns Object containing weather data and loading state
 */
export function useTripWeather(days: TripDayWithLocation[] | undefined) {
  // Prepare the location data for each day
  const prepareRequestData = useCallback(() => {
    if (!days || days.length === 0) return null;
    
    // Map each day to include necessary data for weather fetching
    // Note: In a real implementation, you would need to enrich trip days with lat/lon data
    // For now, we're using a placeholder that assumes this data would be available
    return {
      days: days.map(day => ({
        day_id: day.day_id,
        date: day.date,
        // Note: This would need to be available from your trip data - 
        // coordinates for the location on this specific day
        latitude: getLocationForDay(day)?.latitude,
        longitude: getLocationForDay(day)?.longitude,
      })),
    };
  }, [days]);
  
  // Fetch weather data using SWR
  const { data, error, isLoading } = useSWRImmutable<WeatherResponse>(
    days ? ['weather', JSON.stringify(days.map(d => d.day_id))] : null,
    async () => {
      const requestData = prepareRequestData();
      if (!requestData) return {};
      
      // Skip API call if no location data is available
      const daysWithLocation = requestData.days.filter(
        day => day.latitude && day.longitude
      );
      
      if (daysWithLocation.length === 0) return {};
      
      const response = await fetch('/api/weather', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ days: daysWithLocation }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch weather data');
      }
      
      return response.json();
    }
  );
  
  // Get weather for a specific day
  const getWeatherForDay = useCallback(
    (dayId: string): WeatherDayDTO | null => {
      if (!data || !days) return null;
      
      // Find the day
      const day = days.find(d => d.day_id === dayId);
      if (!day) return null;
      
      // Return weather data for this day
      return data[day.date] || null;
    },
    [data, days]
  );
  
  return {
    weatherData: data,
    getWeatherForDay,
    isLoading,
    error,
  };
}

/**
 * Helper function to get location data for a day
 * In a real implementation, this would need to be implemented based on your data model
 */
function getLocationForDay(day: TripDay): { latitude: number; longitude: number } | null {
  // This is a placeholder implementation
  // In a real app, you would retrieve this from your trip data
  // For example, each day might be associated with a destination/accommodation
  // that has latitude and longitude coordinates
  
  // For now, we return null to indicate this needs to be implemented
  return null;
}