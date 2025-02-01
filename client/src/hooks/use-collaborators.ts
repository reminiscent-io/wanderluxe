import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Collaborator } from "@db/schema";
import { useToast } from "./use-toast";

interface InviteCollaboratorData {
  userId: number;
  role: "viewer" | "editor" | "owner";
}

export function useCollaborators(tripId: number) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: collaborators, isLoading, error } = useQuery<Collaborator[]>({
    queryKey: [`/api/trips/${tripId}/collaborators`],
    enabled: !!tripId,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
  });

  const inviteCollaboratorMutation = useMutation({
    mutationFn: async (data: InviteCollaboratorData) => {
      const response = await fetch(`/api/trips/${tripId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to invite collaborator");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/collaborators`] });
      toast({
        title: "Collaborator invited",
        description: "The invitation has been sent successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to invite collaborator",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    collaborators,
    isLoading,
    error,
    inviteCollaborator: inviteCollaboratorMutation.mutate,
    isInviting: inviteCollaboratorMutation.isPending,
  };
}