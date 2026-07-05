import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Trip } from '@/types/trip';

/**
 * Fetches all public (showcase) trips, ordered by arrival date.
 *
 * Shared by the Explore hub and the homepage featured-destinations section so
 * both render from a single cached query (same key) — and so every public
 * destination has a crawlable internal link from more than one indexed page.
 */
export function usePublicTrips() {
  return useQuery({
    queryKey: ['public-trips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('is_public', true)
        .order('arrival_date', { ascending: true });

      if (error) {
        console.error('Error fetching public trips:', error);
        throw error;
      }

      return data as Trip[];
    },
  });
}
