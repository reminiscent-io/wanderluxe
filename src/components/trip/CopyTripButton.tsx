import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { copyPublicTrip, daysBetweenIso, shiftIsoDate } from '@/services/copyTripService';
import { formatDateRange } from '@/utils/dateUtils';

interface CopyTripButtonProps {
  tripId: string;
  destination: string;
  arrivalDate: string | null;
  departureDate: string | null;
  className?: string;
}

/** Today as `YYYY-MM-DD` in the viewer's own timezone. */
function todayIso(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

/**
 * Turns a showcase itinerary into a starting point.
 *
 * A finished trip teaches more about what the app can do than any amount of
 * explanation — but only if you can actually pick it up and change it.
 */
export function CopyTripButton({
  tripId,
  destination,
  arrivalDate,
  departureDate,
  className,
}: CopyTripButtonProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useAuth();

  const [open, setOpen] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  // Default to a month out: far enough to be a real plan, near enough to feel
  // like one you're actually making.
  const [startDate, setStartDate] = useState(() => shiftIsoDate(todayIso(), 30));

  const preview = useMemo(() => {
    if (!arrivalDate || !departureDate || !startDate) return null;
    const shift = daysBetweenIso(arrivalDate, startDate);
    return formatDateRange(startDate, shiftIsoDate(departureDate, shift));
  }, [arrivalDate, departureDate, startDate]);

  const handleOpen = () => {
    if (!session) {
      // Come back to this trip after signing in, so the intent isn't lost.
      // `pendingRedirect` is the convention Auth.tsx already reads.
      sessionStorage.setItem('pendingRedirect', window.location.pathname);
      navigate('/auth');
      return;
    }
    setOpen(true);
  };

  const handleCopy = async () => {
    setIsCopying(true);
    try {
      const newTripId = await copyPublicTrip(tripId, startDate || undefined);
      await queryClient.invalidateQueries({ queryKey: ['my-trips'] });
      toast.success(`${destination} is now in My Trips — edit it however you like.`);
      setOpen(false);
      navigate(`/trip/${newTripId}/timeline`);
    } catch (error) {
      console.error('Failed to copy trip:', error);
      toast.error(
        error instanceof Error ? error.message : "That copy didn't go through. Please try again."
      );
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <>
      <Button variant="sunset" size="lg" onClick={handleOpen} className={className}>
        <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
        Make this trip mine
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              Copy this {destination} trip
            </DialogTitle>
            <DialogDescription className="text-base">
              You'll get your own copy — every day, hotel, activity and reservation —
              to change however you like. The original stays as it is.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Label htmlFor="copy-start-date" className="text-base">
              When are you going?
            </Label>
            <input
              id="copy-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-border bg-background px-3 text-base text-foreground focus:border-earth-500 focus:outline-none focus:ring-2 focus:ring-earth-500/30"
            />
            {preview && (
              <p className="mt-3 text-sm text-muted-foreground">
                Your trip will run <span className="font-medium text-foreground">{preview}</span>.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isCopying}>
              Cancel
            </Button>
            <Button variant="sunset" onClick={handleCopy} disabled={isCopying || !startDate}>
              {isCopying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Copying…
                </>
              ) : (
                'Copy to my trips'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default CopyTripButton;
