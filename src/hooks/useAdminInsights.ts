import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { supabase } from '@/integrations/supabase/client';
import { useAdminMetrics } from './useAdminMetrics';

export interface AdminInsight {
  id: string;
  insight_text: string;
  metrics_snapshot: Record<string, unknown>;
  model: string;
  created_at: string;
}

export interface UseAdminInsightsReturn {
  insights: AdminInsight[];
  isLoadingHistory: boolean;
  isGenerating: boolean;
  streamingContent: string;
  error: string | null;
  generateInsight: () => Promise<void>;
}

export function useAdminInsights(): UseAdminInsightsReturn {
  const queryClient = useQueryClient();
  const metrics = useAdminMetrics();

  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Get auth token
  const getAuthToken = useCallback(async (): Promise<string | null> => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }, []);

  // Fetch insight history
  const { data: historyData, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['admin', 'insights'],
    queryFn: async (): Promise<AdminInsight[]> => {
      const token = await getAuthToken();
      if (!token) return [];

      const response = await fetch('/api/admin/insights?limit=20', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to load insights');

      const data = await response.json();
      return data.insights || [];
    },
    staleTime: 60 * 1000
  });

  // Generate new insight
  const generateInsight = useCallback(async () => {
    if (isGenerating) return;

    setError(null);
    setIsGenerating(true);
    setStreamingContent('');

    const token = await getAuthToken();
    if (!token) {
      setError('Please sign in to generate insights');
      setIsGenerating(false);
      return;
    }

    // Build metrics payload from current hook data
    const payload = {
      userCount: metrics.userCount,
      activeUsers7d: metrics.activeUsers7d,
      activeUsers30d: metrics.activeUsers30d,
      newUsers30d: metrics.newUsers30d,
      tripStats: metrics.tripStats,
      groupedActions: metrics.groupedActions,
      avgEventsPerDay: metrics.avgEventsPerDay,
      peakDay: metrics.peakDay,
      engagementTrend: metrics.engagementTrend,
      sharingStats: metrics.sharingStats,
      dailyUniqueUsersChart: metrics.dailyUniqueUsersChart,
      dailyEngagementChart: metrics.dailyEngagementChart,
      sharesOverTime: metrics.sharesOverTime
    };

    abortControllerRef.current = new AbortController();
    let fullContent = '';

    try {
      await fetchEventSource('/api/admin/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal,

        onopen: async (response) => {
          if (!response.ok) {
            let errorData;
            try {
              errorData = await response.json();
            } catch {
              errorData = { message: `Server error: ${response.status}` };
            }
            throw errorData;
          }
        },

        onmessage: (event) => {
          try {
            if (event.event === 'message') {
              const data = JSON.parse(event.data);
              fullContent += data.content;
              setStreamingContent(fullContent);
            } else if (event.event === 'done') {
              setStreamingContent('');
              setIsGenerating(false);
              // Refresh history to include the new insight
              queryClient.invalidateQueries({ queryKey: ['admin', 'insights'] });
            } else if (event.event === 'error') {
              const data = JSON.parse(event.data);
              throw new Error(data.message || 'Failed to generate insight');
            }
          } catch (parseError) {
            if (parseError instanceof Error && parseError.message !== 'Failed to generate insight') {
              console.error('Error parsing SSE message:', parseError);
            } else {
              throw parseError;
            }
          }
        },

        onerror: (err) => {
          console.error('SSE connection error:', err);
          throw err;
        }
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setStreamingContent('');
        setIsGenerating(false);
        return;
      }

      const errorMessage = err instanceof Error
        ? err.message
        : (err as { message?: string })?.message || 'Failed to generate insight';
      setError(errorMessage);
      setStreamingContent('');
      setIsGenerating(false);
    }
  }, [isGenerating, getAuthToken, metrics, queryClient]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    insights: historyData || [],
    isLoadingHistory,
    isGenerating,
    streamingContent,
    error,
    generateInsight
  };
}
