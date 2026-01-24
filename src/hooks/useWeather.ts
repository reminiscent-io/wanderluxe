import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface WeatherData {
  temp: number;
  tempF: number;
  description: string;
  icon: string;
  timezone: number;
  localTime: string;
  humidity: number;
  windSpeed: number;
}

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
    enabled: !!destination,
    staleTime: 30 * 60 * 1000, // 30 min cache
    refetchInterval: 30 * 60 * 1000, // Refetch every 30 min
    retry: 1, // Only retry once on failure
  });
}

// Weather icon mapping to emoji/description for fallback
export function getWeatherEmoji(icon: string): string {
  const iconMap: Record<string, string> = {
    '01d': '\u2600\ufe0f',
    '01n': '\ud83c\udf19',
    '02d': '\u26c5',
    '02n': '\u2601\ufe0f',
    '03d': '\u2601\ufe0f',
    '03n': '\u2601\ufe0f',
    '04d': '\u2601\ufe0f',
    '04n': '\u2601\ufe0f',
    '09d': '\ud83c\udf27\ufe0f',
    '09n': '\ud83c\udf27\ufe0f',
    '10d': '\ud83c\udf26\ufe0f',
    '10n': '\ud83c\udf27\ufe0f',
    '11d': '\u26c8\ufe0f',
    '11n': '\u26c8\ufe0f',
    '13d': '\u2744\ufe0f',
    '13n': '\u2744\ufe0f',
    '50d': '\ud83c\udf2b\ufe0f',
    '50n': '\ud83c\udf2b\ufe0f',
  };
  return iconMap[icon] || '\ud83c\udf24\ufe0f';
}
