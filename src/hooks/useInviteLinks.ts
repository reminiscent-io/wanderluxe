import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  getInviteLinks,
  createInviteLink,
  updateInviteLink,
  disableInviteLink,
  deleteInviteLink,
} from '@/services/inviteLinkService';
import type { InviteLink } from '@/integrations/supabase/invite_link_types';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

export function useInviteLinks(tripId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['invite-links', tripId];

  const { data: inviteLinks = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => getInviteLinks(tripId),
    enabled: !!tripId,
  });

  // Real-time subscription
  useRealtimeSubscription({
    channelKey: `invite-links:${tripId}`,
    tables: [
      { table: 'trip_invite_links', filterColumn: 'trip_id', filterValue: tripId },
    ],
    invalidateKeys: [queryKey],
    enabled: !!tripId,
  });

  const createMutation = useMutation({
    mutationFn: ({
      permissionLevel,
      neverExpires,
    }: {
      permissionLevel: 'read' | 'edit';
      neverExpires: boolean;
    }) => createInviteLink(tripId, permissionLevel, neverExpires),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ linkId, updates }: { linkId: string; updates: { permission_level?: 'read' | 'edit'; expires_at?: string | null } }) =>
      updateInviteLink(linkId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const disableMutation = useMutation({
    mutationFn: (linkId: string) => disableInviteLink(linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (linkId: string) => deleteInviteLink(linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    inviteLinks,
    loading: isLoading,
    createLink: createMutation.mutateAsync,
    creating: createMutation.isPending,
    updateLink: updateMutation.mutateAsync,
    disableLink: disableMutation.mutateAsync,
    deleteLink: deleteMutation.mutateAsync,
  };
}
