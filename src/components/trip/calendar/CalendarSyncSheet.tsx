import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CalendarOff, Copy, Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useCalendarFeed } from './useCalendarFeed';

interface CalendarSyncSheetProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CalendarSyncSheet: React.FC<CalendarSyncSheetProps> = ({ tripId, open, onOpenChange }) => {
  const { enabled, isLoading, subscribeUrl, downloadUrl, enable, reset, disable } = useCalendarFeed(tripId);
  const [busy, setBusy] = React.useState(false);

  // Guards every mutation: disables buttons while in flight and surfaces a toast on
  // failure (e.g. an RLS-denied update) instead of failing silently.
  const run = async (action: () => Promise<void>, success: string, failure: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(success);
    } catch {
      toast.error(failure);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!subscribeUrl) return;
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(subscribeUrl);
      toast.success('Subscribe link copied');
    } catch {
      toast.error('Could not copy. Select the link and copy it manually.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent mobileSheet className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Add trip to your calendar</DialogTitle>
          <DialogDescription>Subscribe once and your calendar updates as the trip changes. Times show in the destination's local time.</DialogDescription>
        </DialogHeader>

        {!enabled ? (
          <div className="py-6">
            <Button variant="sunset" disabled={isLoading || busy} onClick={() => run(enable, 'Calendar feed ready', 'Could not create the calendar link')}>
              Create subscribe link
            </Button>
          </div>
        ) : (
          <div className="space-y-5 py-4">
            <div>
              <label htmlFor={`calendar-sub-${tripId}`} className="text-xs font-medium text-muted-foreground">Subscribe link</label>
              <div className="mt-1 flex gap-2">
                <input id={`calendar-sub-${tripId}`} readOnly value={subscribeUrl ?? ''} className="flex-1 rounded-md border border-input bg-muted px-2 py-1.5 text-xs" onFocus={(e) => e.currentTarget.select()} />
                <Button variant="outline" size="icon" aria-label="Copy link" onClick={copy}><Copy className="h-4 w-4" /></Button>
              </div>
            </div>

            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong className="text-foreground">Google:</strong> Other calendars → From URL → paste the link.</p>
              <p><strong className="text-foreground">Apple:</strong> File → New Calendar Subscription → paste the link.</p>
              <p><strong className="text-foreground">Outlook:</strong> Add calendar → Subscribe from web → paste the link.</p>
              <p className="text-xs">Note: Google refreshes subscribed feeds on its own schedule (often hours), so edits are not instant for subscribers.</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {downloadUrl && (
                <Button asChild variant="outline" size="sm">
                  <a href={downloadUrl} download="trip.ics"><Download className="mr-1.5 h-4 w-4" />Download .ics</a>
                </Button>
              )}
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => run(reset, 'Old links revoked', 'Could not reset the calendar link')}>
                <RefreshCw className="mr-1.5 h-4 w-4" />Reset link
              </Button>
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => run(disable, 'Calendar sync turned off', 'Could not turn off calendar sync')}>
                <CalendarOff className="mr-1.5 h-4 w-4" />Turn off
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CalendarSyncSheet;
