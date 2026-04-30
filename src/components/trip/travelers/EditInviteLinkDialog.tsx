import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { InviteLink } from '@/integrations/supabase/invite_link_types';
import { toast } from 'sonner';

interface EditInviteLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  link: InviteLink;
  onSave: (linkId: string, updates: { permission_level?: 'read' | 'edit'; expires_at?: string | null }) => void;
}

export default function EditInviteLinkDialog({
  open,
  onOpenChange,
  link,
  onSave,
}: EditInviteLinkDialogProps) {
  const [permissionLevel, setPermissionLevel] = useState<'read' | 'edit'>(link.permission_level);
  const [neverExpires, setNeverExpires] = useState(!link.expires_at);

  // Reset when dialog opens with new link data
  useEffect(() => {
    if (open) {
      setPermissionLevel(link.permission_level);
      setNeverExpires(!link.expires_at);
    }
  }, [open, link]);

  const handleSave = () => {
    const updates: { permission_level?: 'read' | 'edit'; expires_at?: string | null } = {};

    if (permissionLevel !== link.permission_level) {
      updates.permission_level = permissionLevel;
    }

    const currentlyNeverExpires = !link.expires_at;
    if (neverExpires !== currentlyNeverExpires) {
      updates.expires_at = neverExpires ? null : new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    }

    if (Object.keys(updates).length === 0) {
      onOpenChange(false);
      return;
    }

    try {
      onSave(link.id, updates);
      onOpenChange(false);
    } catch {
      toast.error('Failed to update invite link');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Invite Link</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Permission level</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={permissionLevel}
              onValueChange={(v) => v && setPermissionLevel(v as 'read' | 'edit')}
              className="justify-start"
            >
              <ToggleGroupItem value="read" aria-label="View only">
                View only
              </ToggleGroupItem>
              <ToggleGroupItem value="edit" aria-label="Can edit">
                Can edit
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Expiration</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={neverExpires ? 'never' : '48h'}
              onValueChange={(v) => v && setNeverExpires(v === 'never')}
              className="justify-start"
            >
              <ToggleGroupItem value="48h" aria-label="Expires in 48 hours">
                48 hours
              </ToggleGroupItem>
              <ToggleGroupItem value="never" aria-label="Never expires">
                Never
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} className="flex-1">
              Save Changes
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
