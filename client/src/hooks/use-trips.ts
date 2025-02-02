import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Trip } from "@db/schema";

export function useTrips() {
  const queryClient = useQueryClient();

  const { data: trips, isLoading } = useQuery<Trip[]>({
    queryKey: ["/api/trips"],
  });

  const createTripMutation = useMutation({
    mutationFn: async (data: Partial<Trip>) => {
      try {
        const response = await fetch("/api/trips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
          credentials: "include",
        });

        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to create trip');
        }

        return result;
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : 'Network error occurred');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
    },
  });

  return {
    trips,
    isLoading,
    createTrip: createTripMutation.mutate,
  };
}
