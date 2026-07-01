import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Copy, Download, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useCalendarFeed } from './useCalendarFeed';

interface CalendarSyncSheetProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CalendarSyncSheet: React.FC<CalendarSyncSheetProps> = ({ tripId, open, onOpenChange }) => {
  const { enabled, isLoading, subscribeUrl, downloadUrl, enable, reset } = useCalendarFeed(tripId);

  const copy = async () => {
    if (!subscribeUrl) return;
    await navigator.clipboard.writeText(subscribeUrl);
    toast.success('Subscribe link copied');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl sm:max-w-md sm:mx-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-xl">Add trip to your calendar</SheetTitle>
          <SheetDescription>Subscribe once and your calendar updates as the trip changes. Times show in the destination's local time.</SheetDescription>
        </SheetHeader>

        {!enabled ? (
          <div className="py-6">
            <Button variant="sunset" disabled={isLoading} onClick={() => enable().then(() => toast.success('Calendar feed ready'))}>
              Create subscribe link
            </Button>
          </div>
        ) : (
          <div className="space-y-5 py-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Subscribe link</label>
              <div className="mt-1 flex gap-2">
                <input readOnly value={subscribeUrl ?? ''} className="flex-1 rounded-md border border-input bg-muted px-2 py-1.5 text-xs" onFocus={(e) => e.currentTarget.select()} />
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
              <Button variant="ghost" size="sm" onClick={() => reset().then(() => toast.success('Old links revoked'))}>
                <RefreshCw className="mr-1.5 h-4 w-4" />Reset link
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CalendarSyncSheet;
