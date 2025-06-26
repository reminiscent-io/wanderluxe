import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

export interface ChatLogRow {
  id: string;
  role: string;
  message: string;
  timestamp: string;
  extracted_data?: unknown;
  attachments?: { type: 'image' | 'pdf'; url: string; name: string }[];
  trip_id: string;
  user_id: string;
}

export const chatLogsKey = (tripId: string) => ['chat_logs', tripId];

export function useChat(tripId: string) {
  const qc = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  /* Fallback chat data management using local storage */
  const query = useQuery({
    queryKey: chatLogsKey(tripId),
    queryFn: async (): Promise<ChatLogRow[]> => {
      try {
        // Try to get from local storage as fallback
        const stored = localStorage.getItem(`chat_logs_${tripId}`);
        if (stored) {
          return JSON.parse(stored);
        }
        return [];
      } catch (error) {
        console.warn('Failed to load chat logs:', error);
        return [];
      }
    },
    enabled: !!tripId,
  });

  // Helper function to save to local storage
  const saveChatLogs = (logs: ChatLogRow[]) => {
    try {
      localStorage.setItem(`chat_logs_${tripId}`, JSON.stringify(logs));
    } catch (error) {
      console.warn('Failed to save chat logs:', error);
    }
  };

  // Function to add new message
  const addMessage = (message: ChatLogRow) => {
    qc.setQueryData<ChatLogRow[]>(chatLogsKey(tripId), prev => {
      const updated = [...(prev ?? []), message];
      saveChatLogs(updated);
      return updated;
    });
  };

  return { ...query, addMessage };
}
