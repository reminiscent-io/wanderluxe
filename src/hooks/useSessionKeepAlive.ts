
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to silently keep the user session alive during active work sessions
 * This is particularly useful for forms and pages where users might be
 * entering data for a while without submitting
 */
export function useSessionKeepAlive(interval = 10 * 60 * 1000) {
  const lastActivityTime = useRef(Date.now());
  
  useEffect(() => {
    // Track user activity
    const trackActivity = () => {
      lastActivityTime.current = Date.now();
    };
    
    // Add listeners for user activity
    window.addEventListener('mousemove', trackActivity);
    window.addEventListener('keydown', trackActivity);
    window.addEventListener('click', trackActivity);
    
    // Create a light touch for the session while the user is on this page
    // and only if they've been active recently
    const keepAliveInterval = setInterval(async () => {
      const isUserActive = Date.now() - lastActivityTime.current < 15 * 60 * 1000; // 15 min inactivity threshold
      
      if (isUserActive) {
        try {
          // Perform a lightweight query to keep the session active
          await supabase.from('profiles').select('id', { count: 'exact', head: true });
          console.log('Session keep-alive ping sent');
        } catch (error) {
          console.warn('Session keep-alive ping failed', error);
        }
      }
    }, interval);

    return () => {
      clearInterval(keepAliveInterval);
      window.removeEventListener('mousemove', trackActivity);
      window.removeEventListener('keydown', trackActivity);
      window.removeEventListener('click', trackActivity);
    };
  }, [interval]);
}
