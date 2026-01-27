import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DailyForecast {
  date: string;
  tempHigh: number;
  tempLow: number;
  condition: string;
  icon: string;
  description: string;
}

export interface WeatherData {
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

// Weather-proxy edge function is deployed
const WEATHER_FEATURE_ENABLED = true;

export function useWeather(destination: string | undefined) {
  return useQuery<WeatherData>({
    queryKey: ['weather', destination],
    queryFn: async () => {
      if (!destination) {
        throw new Error('No destination provided');
      }

      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/weather-proxy`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token && {
              'Authorization': `Bearer ${session.access_token}`
            })
          },
          body: JSON.stringify({ destination })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch weather');
      }

      return response.json();
    },
    // Disabled until weather-proxy edge function is deployed
    enabled: WEATHER_FEATURE_ENABLED && !!destination,
    staleTime: 30 * 60 * 1000, // 30 min - data is cached server-side for 6 hours
    refetchInterval: 30 * 60 * 1000,
    retry: 1,
  });
}

// Get weather for a specific date from the forecast
export function getWeatherForDate(weather: WeatherData | undefined, date: string): DailyForecast | undefined {
  if (!weather?.daily) return undefined;
  return weather.daily.find(d => d.date === date);
}

// Check if a date is today (in local timezone)
export function isToday(dateString: string): boolean {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  return dateString === todayStr;
}

// Get the current weather if the date is today
export function getCurrentWeatherForToday(weather: WeatherData | undefined, date: string): WeatherData['current'] | undefined {
  if (!weather?.current || !isToday(date)) return undefined;
  return weather.current;
}

// Weather condition to icon mapping
export function getWeatherIcon(condition: string): string {
  const icons: Record<string, string> = {
    'clear': '\u2600\ufe0f',       // ☀️
    'partly-cloudy': '\u26c5',    // ⛅
    'cloudy': '\u2601\ufe0f',     // ☁️
    'overcast': '\u2601\ufe0f',   // ☁️
    'rain': '\ud83c\udf27\ufe0f', // 🌧️
    'thunderstorm': '\u26c8\ufe0f', // ⛈️
    'snow': '\u2744\ufe0f',       // ❄️
    'fog': '\ud83c\udf2b\ufe0f',  // 🌫️
  };
  return icons[condition] || '\ud83c\udf24\ufe0f'; // 🌤️ default
}

// Weather icon mapping from OpenWeatherMap icon codes
export function getWeatherEmoji(icon: string): string {
  const code = icon?.slice(0, 2);
  const iconMap: Record<string, string> = {
    '01': '\u2600\ufe0f',         // ☀️ clear
    '02': '\u26c5',               // ⛅ few clouds
    '03': '\u2601\ufe0f',         // ☁️ scattered clouds
    '04': '\u2601\ufe0f',         // ☁️ broken clouds
    '09': '\ud83c\udf27\ufe0f',   // 🌧️ shower rain
    '10': '\ud83c\udf26\ufe0f',   // 🌦️ rain
    '11': '\u26c8\ufe0f',         // ⛈️ thunderstorm
    '13': '\u2744\ufe0f',         // ❄️ snow
    '50': '\ud83c\udf2b\ufe0f',   // 🌫️ mist
  };
  return iconMap[code] || '\ud83c\udf24\ufe0f'; // 🌤️ default
}
