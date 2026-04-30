import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, Share2, Loader2 } from 'lucide-react';
import { buildInviteUrl, buildShareText } from '@/services/inviteLinkService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface InviteLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (params: { permissionLevel: 'read' | 'edit'; neverExpires: boolean }) => Promise<any>;
  creating: boolean;
  tripDestination: string;
}

export default function InviteLinkDialog({
  open,
  onOpenChange,
  onGenerate,
  creating,
  tripDestination,
}: InviteLinkDialogProps) {
  const { fullName } = useAuth();
  const [permissionLevel, setPermissionLevel] = useState<'read' | 'edit'>('read');
  const [neverExpires, setNeverExpires] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const ownerName = fullName || 'Someone';
  const preamble = tripDestination
    ? `${ownerName} invited you to join "${tripDestination}" on WanderLuxe! Click the link to view details and start planning together.`
    : `${ownerName} invited you to join a trip on WanderLuxe!`;

  const handleGenerate = async () => {
    try {
      const link = await onGenerate({ permissionLevel, neverExpires });
      setGeneratedUrl(buildInviteUrl(link.invite_code));
    } catch {
      toast.error('Failed to generate invite link');
    }
  };

  const handleCopy = async () => {
    if (!generatedUrl) return;
    const textToCopy = buildShareText(ownerName, tripDestination, generatedUrl);
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleShare = async () => {
    if (!generatedUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: tripDestination
            ? `Join "${tripDestination}" on WanderLuxe`
            : 'Join my trip on WanderLuxe',
          text: preamble,
          url: generatedUrl,
        });
      } catch (err: any) {
        // User cancelled share — ignore AbortError
        if (err?.name !== 'AbortError') {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset state when closing
      setGeneratedUrl(null);
      setCopied(false);
      setPermissionLevel('read');
      setNeverExpires(false);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Invite Link</DialogTitle>
        </DialogHeader>

        {!generatedUrl ? (
          <div className="space-y-5 py-2">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Permission Level</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={permissionLevel === 'read' ? 'bg-earth-500 text-white hover:bg-earth-600 border-earth-500' : ''}
                  onClick={() => setPermissionLevel('read')}
                >
                  View Only
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={permissionLevel === 'edit' ? 'bg-earth-500 text-white hover:bg-earth-600 border-earth-500' : ''}
                  onClick={() => setPermissionLevel('edit')}
                >
                  Can Edit
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Expiration</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={!neverExpires ? 'bg-earth-500 text-white hover:bg-earth-600 border-earth-500' : ''}
                  onClick={() => setNeverExpires(false)}
                >
                  48 Hours
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className={neverExpires ? 'bg-earth-500 text-white hover:bg-earth-600 border-earth-500' : ''}
                  onClick={() => setNeverExpires(true)}
                >
                  Never
                </Button>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={creating}
              className="w-full"
            >
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Link'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">{preamble}</p>
            <div className="flex gap-2">
              <Input
                readOnly
                value={generatedUrl}
                className="text-sm"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button size="icon" variant="outline" onClick={handleCopy} title="Copy link">
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleShare} className="flex-1">
                <Share2 className="mr-2 h-4 w-4" />
                {navigator.share ? 'Share' : 'Copy Link'}
              </Button>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
