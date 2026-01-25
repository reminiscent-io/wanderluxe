import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface UseIsAdminResult {
  isAdmin: boolean;
  isLoading: boolean;
  error: Error | null;
}

export function useIsAdmin(): UseIsAdminResult {
  const { session } = useAuth();

  const { data: isAdmin, isLoading, error } = useQuery({
    queryKey: ['isAdmin', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) {
        return false;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error('Error checking admin status:', error);
        return false;
      }

      return data?.is_admin ?? false;
    },
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    isAdmin: isAdmin ?? false,
    isLoading: isLoading && !!session?.user?.id,
    error: error as Error | null,
  };
}
