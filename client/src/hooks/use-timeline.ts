
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TimelineEntry } from "@db/schema";

export function useTimeline(tripId: number) {
  const queryClient = useQueryClient();

  const { data: entries, isLoading } = useQuery<TimelineEntry[]>({
    queryKey: [`timeline-${tripId}`],
    queryFn: async () => {
      const response = await fetch(`/api/trips/${tripId}/timeline`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch timeline');
      }
      return response.json();
    },
    enabled: !!tripId,
  });

  const createEntryMutation = useMutation({
    mutationFn: async (data: Partial<TimelineEntry>) => {
      const response = await fetch(`/api/trips/${tripId}/timeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`timeline-${tripId}`] });
    },
  });

  const updateEntryMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<TimelineEntry> & { id: number }) => {
      const response = await fetch(`/api/trips/${tripId}/timeline/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`timeline-${tripId}`] });
    },
  });

  return {
    entries: entries || [],
    isLoading,
    createEntry: createEntryMutation.mutate,
    updateEntry: updateEntryMutation.mutate,
  };
}
