import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Trip } from "@db/schema";

export function useTrips() {
  const queryClient = useQueryClient();

  const { data: trips, isLoading } = useQuery<Trip[]>({
    queryKey: ["/api/trips"],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/trips`, {
        credentials: "include",
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch trips");
      }
      return response.json();
    }
  });

  const createTripMutation = useMutation({
    mutationFn: async (data: Partial<Trip>) => {
      console.log('Creating trip:', data);
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/trips`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
          credentials: "include",
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || 'Failed to create trip');
        }

        return response.json();
      } catch (error) {
        console.error('Trip creation error:', error);
        throw error;
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