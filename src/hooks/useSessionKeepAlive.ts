
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to silently keep the user session alive during active work sessions
 * This is particularly useful for forms and pages where users might be
 * entering data for a while without submitting
 */
export function useSessionKeepAlive(interval = 5 * 60 * 1000) {
  useEffect(() => {
    // Create a light touch for the session while the user is on this page
    const keepAliveInterval = setInterval(async () => {
      try {
        // Perform a lightweight query to keep the session active
        await supabase.from('profiles').select('id', { count: 'exact', head: true });
        console.log('Session keep-alive ping sent');
      } catch (error) {
        console.warn('Session keep-alive ping failed', error);
      }
    }, interval);

    return () => {
      clearInterval(keepAliveInterval);
    };
  }, [interval]);
}
