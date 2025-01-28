import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Collaborator } from "@db/schema";

export function useCollaborators(tripId: number) {
  const queryClient = useQueryClient();

  const { data: collaborators, isLoading } = useQuery<Collaborator[]>({
    queryKey: [`/api/trips/${tripId}/collaborators`],
    enabled: !!tripId,
  });

  const inviteCollaboratorMutation = useMutation({
    mutationFn: async (data: { userId: number; role: string }) => {
      const response = await fetch(`/api/trips/${tripId}/collaborators`, {
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
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/collaborators`] });
    },
  });

  return {
    collaborators,
    isLoading,
    inviteCollaborator: inviteCollaboratorMutation.mutate,
  };
}
