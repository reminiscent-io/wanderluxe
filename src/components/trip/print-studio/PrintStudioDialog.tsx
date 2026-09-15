// Print dialog: the single Print entry point for a trip. The body holds the
// free Simple PDF section (pdfmake export) above the Studio edition section.
// The Studio half shows Pro members the theme field, free users the
// StudioTeaser preview of their own trip, and anyone the generating panel
// while an edition is being made, followed by the trip's earlier editions
// (RLS lets any trip member read them; only generation is gated).
// `initialSection="studio"` scrolls the body to the Studio half on open.
//
// Layout contract: header and footer are fixed, the middle region is the only
// scroller. The dialog is height-capped by DialogContent, so without that
// middle scroller a tall body (both sections plus a trip's editions) pushes the
// primary action off-screen on short viewports with no way to reach it.

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, Loader2, Printer, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { track } from '@/lib/analytics';
import type { PrintDesignSpec } from '@/lib/printDesign/spec';
import { swatchColors } from './swatch';
import {
  countCopyEdits,
  sanitizeCopyOverrides,
  type PrintCopyOverrides,
} from '@/lib/printDesign/edits';
import SimplePdfSection from './SimplePdfSection';
import StudioTeaser from './StudioTeaser';

interface PrintStudioDialogProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Titles the free preview's cover. */
  tripDestination?: string;
  /** Which half the traveler asked for. Deep links from the guide set this. */
  initialSection?: 'pdf' | 'studio';
}

interface DesignListRow {
  id: string;
  theme_prompt: string | null;
  design: PrintDesignSpec;
  copy_overrides: PrintCopyOverrides | null;
  finalized_at: string | null;
  created_at: string;
}


/**
 * What has happened to an edition since it was generated, in the fewest words
 * that still distinguish the two states that matter: whether its itinerary is
 * still moving, and whether the words are the model's or the traveler's.
 */
function editionState(d: DesignListRow): string {
  if (d.finalized_at) return 'finalized';
  const edits = d.design ? countCopyEdits(d.design, sanitizeCopyOverrides(d.copy_overrides)) : 0;
  if (edits > 0) return edits === 1 ? '1 line rewritten' : `${edits} lines rewritten`;
  return '';
}

/** Named so the wait reads as work being done, not a spinner being spun. */
const GENERATING_STEPS = [
  'Reading every day of your trip',
  'Choosing a palette and typefaces',
  'Writing captions for each day',
  'Setting the cover',
];

/**
 * Starting points, so the answer to "theme?" is a tap rather than typing on a
 * phone. Each maps onto a motif the renderer already knows how to draw.
 */
const THEME_SUGGESTIONS = [
  'Sun-bleached coast',
  'Art deco poster',
  'Botanical notes',
  'Desert night sky',
];

/** Past this, the 300-character limit starts silently eating keystrokes. */
const THEME_MAX = 300;
const THEME_COUNTER_FROM = 240;

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token ?? null;
}

/**
 * Three bands of the edition's own palette — a paint chip, not a pie chart.
 * It is the only place the list shows what an edition actually looks like.
 */
const PaletteSwatch: React.FC<{ palette?: Partial<PrintDesignSpec['palette']> }> = ({ palette }) => (
  <span
    className="flex h-7 w-7 shrink-0 overflow-hidden rounded-md border border-border"
    aria-hidden
  >
    {swatchColors(palette).map((color, i) => (
      <span key={i} className="h-full flex-1" style={{ background: color }} />
    ))}
  </span>
);

const PrintStudioDialog: React.FC<PrintStudioDialogProps> = ({
  tripId,
  open,
  onOpenChange,
  tripDestination,
  initialSection = 'pdf',
}) => {
  const { subscriptionTier, user } = useAuth();
  const isPro = subscriptionTier === 'pro';
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [theme, setTheme] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingStep, setGeneratingStep] = useState(0);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  // A state-backed ref rather than a plain useRef: Radix's Portal defers its
  // very first real DOM mount by one extra internal commit (its own
  // `mounted` flag starts false and flips via a layout effect, independent
  // of `open`), so a plain useRef read from this component's own effect can
  // still be null the first time this effect runs. Tracking the node in
  // state re-fires this effect once Radix actually attaches it.
  const [studioEl, setStudioEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || initialSection !== 'studio' || !studioEl) return;
    if (typeof studioEl.scrollIntoView === 'function') {
      studioEl.scrollIntoView({ block: 'start' });
    }
  }, [open, initialSection, studioEl]);

  const {
    data: designs,
    isLoading: designsLoading,
    isError: designsError,
  } = useQuery({
    queryKey: ['print-designs', tripId],
    enabled: open && !!user,
    queryFn: async (): Promise<DesignListRow[]> => {
      const { data, error } = await supabase
        .from('trip_print_designs')
        .select('id, theme_prompt, design, copy_overrides, finalized_at, created_at')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false })
        .limit(12);
      if (error) throw error;
      return (data ?? []) as unknown as DesignListRow[];
    },
  });

  const handleGenerate = async () => {
    const token = await getToken();
    if (!token) {
      toast.error('Sign in to use the Print Studio');
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsGenerating(true);
    setGeneratingStep(0);
    const ticker = setInterval(
      () => setGeneratingStep((i) => Math.min(i + 1, GENERATING_STEPS.length - 1)),
      4000
    );
    track('print_studio_generate', { trip_id: tripId, has_theme: !!theme.trim() });

    try {
      const resp = await fetch(`/api/trips/${tripId}/print-design`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(theme.trim() ? { theme: theme.trim() } : {}),
        signal: controller.signal,
      });

      const body = await resp.json().catch((): null => null);

      if (!resp.ok || !body?.id) {
        const message =
          body?.code === 'PRO_REQUIRED' ? 'Print Studio is a Pro feature.'
          : body?.code === 'DAILY_LIMIT_REACHED' ? body.message || 'Daily design limit reached.'
          : body?.code === 'CONFIG_ERROR' ? 'Print Studio is not available right now.'
          : body?.message || 'Design generation failed. Please try again.';
        toast.error(message);
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ['print-designs', tripId] });
      setTheme('');
      onOpenChange(false);
      navigate(`/trip/${tripId}/print/${body.id}`);
    } catch (e) {
      // A cancel is a choice, not a failure — the server may still finish, and
      // the edition shows up in the list when it does.
      if ((e as Error)?.name === 'AbortError') return;
      console.error('Print design error:', e);
      toast.error('Could not reach the Print Studio. Check your connection and try again.');
    } finally {
      clearInterval(ticker);
      abortRef.current = null;
      setIsGenerating(false);
    }
  };

  const cancelGeneration = () => {
    abortRef.current?.abort();
  };

  /** Closing mid-generation cancels rather than leaving a dead close button. */
  const handleOpenChange = (next: boolean) => {
    if (!next && isGenerating) cancelGeneration();
    onOpenChange(next);
  };

  const handleUpgrade = async () => {
    const token = await getToken();
    if (!token) {
      toast.error('Sign in to upgrade');
      return;
    }
    setIsUpgrading(true);
    track('print_studio_upgrade_click', { trip_id: tripId, source: 'print_dialog' });
    try {
      const resp = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await resp.json().catch((): null => null);
      if (resp.ok && data?.url) {
        window.location.href = data.url;
      } else {
        toast.error(data?.error || 'Failed to start checkout');
      }
    } catch {
      toast.error('Connection failed. Check your network and try again.');
    } finally {
      setIsUpgrading(false);
    }
  };

  const openDesign = (id: string) => {
    onOpenChange(false);
    navigate(`/trip/${tripId}/print/${id}`);
  };

  const hasEditions = (designs?.length ?? 0) > 0;

  // Earlier editions. Sits below a hairline in both variants; the dialog body
  // is the scroller, so the list is never sliced through a row.
  const editionList = (designsLoading || designsError || hasEditions) && (
    <section className="border-t border-border pt-4">
      <h4 className="mb-2 text-sm font-medium text-foreground">Earlier editions</h4>
      {designsLoading ? (
        <div className="space-y-1.5" aria-hidden>
          <Skeleton className="h-[56px] w-full rounded-card" />
          <Skeleton className="h-[56px] w-full rounded-card" />
        </div>
      ) : designsError ? (
        <p className="text-sm text-muted-foreground">
          Couldn&rsquo;t load earlier editions. Close and reopen to try again.
        </p>
      ) : (
        <ul className="m-0 list-none space-y-1.5 p-0">
          {designs!.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => openDesign(d.id)}
                className="flex w-full items-center gap-3 rounded-card border border-border bg-sand-50/60 px-3 py-2.5 text-left transition-colors hover:border-earth-300 hover:bg-sand-100 active:bg-sand-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <PaletteSwatch palette={d.design?.palette} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {d.design?.themeName ?? 'Edition'}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {format(new Date(d.created_at), 'MMM d, yyyy')}
                    {editionState(d) ? ` · ${editionState(d)}` : ''}
                    {d.theme_prompt ? ` · “${d.theme_prompt}”` : ''}
                  </span>
                </span>
                <Printer className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  // Progress reads as a checklist working down the trip rather than an
  // undifferentiated spinner. Steps recede by ink level and marker, never by
  // opacity, so every line still clears AA. Four steps also make this panel the
  // same height as the theme field it replaces (~168px), so starting a design
  // doesn't collapse and re-centre the dialog — keep them in step if either
  // block grows.
  const generatingPanel = (
    <div className="py-2">
      <ol className="m-0 list-none space-y-3 p-0" aria-hidden>
        {GENERATING_STEPS.map((step, i) => {
          const done = i < generatingStep;
          const active = i === generatingStep;
          return (
            <li
              key={step}
              className={cn(
                'flex items-center gap-3 text-sm',
                active ? 'font-medium text-foreground' : 'text-muted-foreground'
              )}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                {done ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : active ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-sand-300" />
                )}
              </span>
              <span>{step}</span>
            </li>
          );
        })}
      </ol>
      <p className="mt-5 text-xs text-muted-foreground">This usually takes under a minute.</p>
    </div>
  );

  const themeField = (
    <div>
      <label htmlFor="print-theme" className="mb-1.5 block text-sm font-medium text-foreground">
        Theme <span className="font-normal text-muted-foreground">(optional)</span>
      </label>
      <Input
        id="print-theme"
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        maxLength={THEME_MAX}
        placeholder="Describe a direction, or pick one below"
        aria-describedby="print-theme-hint"
      />
      {/* Mobile: a snap rail, so five directions fit without wrapping the
          dialog into a tower. sm+: they wrap. Mirrors the assistant's chips. */}
      <div
        className="-mx-4 mt-2 flex snap-x snap-proximity gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
        role="group"
        aria-label="Suggested directions"
      >
        {THEME_SUGGESTIONS.map((s) => {
          const selected = theme === s;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={selected}
              onClick={() => setTheme(selected ? '' : s)}
              className={cn(
                'inline-flex shrink-0 items-center rounded-full border px-3.5 text-[13px] tracking-tight transition-colors',
                'min-h-[44px] sm:min-h-0 sm:h-9',
                '[scroll-snap-align:start] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                selected
                  ? 'border-earth-600 bg-earth-600 font-medium text-sand-50'
                  : 'border-border bg-background text-earth-600 hover:border-earth-300 hover:bg-sand-100 hover:text-foreground active:bg-sand-200'
              )}
            >
              {s}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-start justify-between gap-3">
        <p id="print-theme-hint" className="text-xs text-muted-foreground">
          Leave blank and the AI will pick a direction that fits the trip.
        </p>
        {theme.length >= THEME_COUNTER_FROM && (
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {theme.length}/{THEME_MAX}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent mobileSheet className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl leading-tight tracking-tight">
            Print Studio
          </DialogTitle>
          <DialogDescription>
            Download a simple PDF of this trip, or have the Studio design an edition of it.
          </DialogDescription>
        </DialogHeader>

        <p className="sr-only" role="status" aria-live="polite">
          {isGenerating ? GENERATING_STEPS[generatingStep] : ''}
        </p>

        {/* The only scroll region: header and footer stay put, so the primary
            action is reachable on a short viewport. */}
        <div className="-mx-4 min-h-0 flex-1 space-y-4 overflow-y-auto px-4 sm:-mx-6 sm:px-6">
          <SimplePdfSection tripId={tripId} />

          <div ref={setStudioEl} className="border-t border-border pt-4">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">Studio edition</h3>
              <span className="shrink-0 text-xs uppercase tracking-wider text-muted-foreground">
                Pro
              </span>
            </div>
            <p className="mt-1 mb-3 text-sm text-muted-foreground">
              The same itinerary, art-directed: a palette, typefaces, a motif, and a line for every
              day.
            </p>

            {isGenerating ? (
              generatingPanel
            ) : isPro ? (
              themeField
            ) : (
              <StudioTeaser tripId={tripId} destination={tripDestination} enabled={open} />
            )}
          </div>

          {!isGenerating && editionList}
        </div>

        {/* Full-bleed rule marks where the scroll region ends, so a list that
            runs under the footer reads as "more below" rather than clipped. */}
        <DialogFooter className="-mx-4 gap-2 border-t border-border px-4 pt-4 sm:-mx-6 sm:gap-0 sm:px-6">
          {isGenerating ? (
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="h-11 w-full sm:h-10 sm:w-auto"
            >
              Cancel
            </Button>
          ) : isPro ? (
            <Button
              variant="sunset"
              onClick={handleGenerate}
              className="h-11 w-full sm:h-10 sm:w-auto"
            >
              <Sparkles className="mr-2 h-4 w-4" aria-hidden />
              Design my edition
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="h-11 w-full text-muted-foreground hover:text-foreground sm:h-10 sm:w-auto"
              >
                Not now
              </Button>
              <Button
                variant="sunset"
                onClick={handleUpgrade}
                disabled={isUpgrading}
                className="h-11 w-full sm:h-10 sm:w-auto"
              >
                {isUpgrading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" aria-hidden />
                )}
                {isUpgrading ? 'Opening checkout…' : 'Unlock the Print Studio'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PrintStudioDialog;
