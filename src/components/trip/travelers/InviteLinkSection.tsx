import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Link2 } from 'lucide-react';
import { useInviteLinks } from '@/hooks/useInviteLinks';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { buildInviteUrl, buildShareText } from '@/services/inviteLinkService';
import InviteLinkDialog from './InviteLinkDialog';
import InviteLinkRow from './InviteLinkRow';
import { toast } from 'sonner';

interface InviteLinkSectionProps {
  tripId: string;
}

export default function InviteLinkSection({ tripId }: InviteLinkSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { inviteLinks, loading, createLink, creating, updateLink, disableLink, deleteLink } = useInviteLinks(tripId);
  const queryClient = useQueryClient();
  const { fullName } = useAuth();

  // Read trip destination from React Query cache (already fetched by useTripQuery)
  const trip = queryClient.getQueryData<any>(['trip', tripId]);
  const tripDestination = trip?.destination || '';
  const ownerName = fullName || 'Someone';

  const handleEdit = async (linkId: string, updates: { permission_level?: 'read' | 'edit'; expires_at?: string | null }) => {
    try {
      await updateLink({ linkId, updates });
    } catch {
      toast.error('Failed to update link');
    }
  };

  const handleDisable = async (linkId: string) => {
    try {
      await disableLink(linkId);
      toast.success('Invite link disabled');
    } catch {
      toast.error('Failed to disable link');
    }
  };

  const handleDelete = async (linkId: string) => {
    try {
      await deleteLink(linkId);
      toast.success('Invite link deleted');
    } catch {
      toast.error('Failed to delete link');
    }
  };

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Link2 className="h-4 w-4 text-earth-500" />
        <h3 className="text-sm font-semibold text-earth-700">Share via Link</h3>
      </div>

      <Button
        size="sm"
        variant="outline"
        className="w-full mb-3 bg-background text-sand-700 border-sand-300 hover:bg-sand-50 hover:border-sand-400"
        onClick={() => setDialogOpen(true)}
      >
        <Link2 className="mr-1 h-3.5 w-3.5" />
        Generate Invite Link
      </Button>

      {loading ? (
        <p className="text-xs text-muted-foreground text-center py-2">Loading links...</p>
      ) : inviteLinks.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">No invite links yet.</p>
      ) : (
        <div className="space-y-2">
          {inviteLinks.map((link) => (
            <InviteLinkRow
              key={link.id}
              link={link}
              shareText={buildShareText(ownerName, tripDestination, buildInviteUrl(link.invite_code))}
              onEdit={handleEdit}
              onDisable={handleDisable}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <InviteLinkDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onGenerate={createLink}
        creating={creating}
        tripDestination={tripDestination}
      />
    </div>
  );
}
