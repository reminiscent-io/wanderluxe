import { useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  getInviteLinks,
  createInviteLink,
  updateInviteLink,
  disableInviteLink,
  deleteInviteLink,
} from '@/services/inviteLinkService';
import type { InviteLink } from '@/integrations/supabase/invite_link_types';

export function useInviteLinks(tripId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['invite-links', tripId];

  const { data: inviteLinks = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => getInviteLinks(tripId),
    enabled: !!tripId,
  });

  // Real-time subscription
  useEffect(() => {
    if (!tripId) return;

    const channel = supabase
      .channel(`invite-links:${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_invite_links',
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, queryClient]);

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
