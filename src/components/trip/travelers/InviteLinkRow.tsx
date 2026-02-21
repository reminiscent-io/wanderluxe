import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Trash2, Link2Off, Pencil } from 'lucide-react';
import type { InviteLink } from '@/integrations/supabase/invite_link_types';
import { format, parseISO, isPast } from 'date-fns';
import { toast } from 'sonner';
import EditInviteLinkDialog from './EditInviteLinkDialog';

interface InviteLinkRowProps {
  link: InviteLink;
  shareText: string;
  onEdit: (linkId: string, updates: { permission_level?: 'read' | 'edit'; expires_at?: string | null }) => void;
  onDisable: (linkId: string) => void;
  onDelete: (linkId: string) => void;
}

export default function InviteLinkRow({ link, shareText, onEdit, onDisable, onDelete }: InviteLinkRowProps) {
  const [copied, setCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const isExpired = link.expires_at ? isPast(parseISO(link.expires_at)) : false;
  const isDisabled = !link.is_active || isExpired;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      toast.success('Share message copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy share message');
    }
  };

  const expiryLabel = () => {
    if (!link.is_active) return 'Disabled';
    if (!link.expires_at) return 'Never expires';
    if (isExpired) return 'Expired';
    return `Expires ${format(parseISO(link.expires_at), 'MMM d, h:mm a')}`;
  };

  return (
    <>
      <div
        className={`flex items-center justify-between gap-2 p-3 rounded-lg border ${
          isDisabled ? 'bg-secondary opacity-60' : 'bg-background'
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant={link.permission_level === 'edit' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {link.permission_level === 'edit' ? 'Edit' : 'View'}
            </Badge>
            <span className="text-xs text-muted-foreground">{expiryLabel()}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {!isDisabled && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setEditOpen(true)}
                title="Edit link"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={handleCopy}
                title="Copy share message"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => onDisable(link.id)}
                title="Disable link"
              >
                <Link2Off className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-red-500 hover:text-red-600"
            onClick={() => onDelete(link.id)}
            title="Delete link"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <EditInviteLinkDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        link={link}
        onSave={onEdit}
      />
    </>
  );
}
