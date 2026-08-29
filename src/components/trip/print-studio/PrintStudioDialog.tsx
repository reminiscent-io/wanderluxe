// Print Studio dialog — the entry point for the Pro keepsake-itinerary
// feature. Pro members describe a theme (or let the AI decide) and generate;
// everyone can open editions that already exist on the trip (RLS allows any
// trip member to read them — only generation is gated).

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Check, Loader2, Palette, Printer, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { track } from '@/lib/analytics';
import type { PrintDesignSpec } from '@/lib/printDesign/spec';

interface PrintStudioDialogProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DesignListRow {
  id: string;
  theme_prompt: string | null;
  design: PrintDesignSpec;
  created_at: string;
}

const GENERATING_LINES = [
  'Reading every day of your trip…',
  'Choosing a palette and typefaces…',
  'Writing captions for each day…',
  'Setting the cover…',
];

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token ?? null;
}

const PrintStudioDialog: React.FC<PrintStudioDialogProps> = ({ tripId, open, onOpenChange }) => {
  const { subscriptionTier, user } = useAuth();
  const isPro = subscriptionTier === 'pro';
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [theme, setTheme] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingLine, setGeneratingLine] = useState(0);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const { data: designs } = useQuery({
    queryKey: ['print-designs', tripId],
    enabled: open && !!user,
    queryFn: async (): Promise<DesignListRow[]> => {
      const { data, error } = await supabase
        .from('trip_print_designs')
        .select('id, theme_prompt, design, created_at')
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

    setIsGenerating(true);
    setGeneratingLine(0);
    const ticker = setInterval(
      () => setGeneratingLine((i) => Math.min(i + 1, GENERATING_LINES.length - 1)),
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
      console.error('Print design error:', e);
      toast.error('Could not reach the Print Studio. Check your connection and try again.');
    } finally {
      clearInterval(ticker);
      setIsGenerating(false);
    }
  };

  const handleUpgrade = async () => {
    const token = await getToken();
    if (!token) {
      toast.error('Sign in to upgrade');
      return;
    }
    setIsUpgrading(true);
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

  const editionList = (designs?.length ?? 0) > 0 && (
    <div className="mt-1">
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Editions of this trip
      </p>
      <ul className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
        {designs!.map((d) => (
          <li key={d.id}>
            <button
              type="button"
              onClick={() => openDesign(d.id)}
              className="flex w-full items-center gap-3 rounded-card border border-border bg-sand-50/60 px-3 py-2 text-left transition-colors hover:border-earth-300 hover:bg-sand-100"
            >
              <span
                className="h-6 w-6 flex-shrink-0 rounded-full border border-border"
                style={{
                  background: `linear-gradient(135deg, ${d.design?.palette?.primary ?? '#3f4a5c'} 50%, ${d.design?.palette?.accent ?? '#b0562e'} 50%)`,
                }}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">
                  {d.design?.themeName ?? 'Edition'}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {new Date(d.created_at).toLocaleDateString()}
                  {d.theme_prompt ? ` · “${d.theme_prompt}”` : ''}
                </span>
              </span>
              <Printer className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  // ---------------------------------------------------------------- non-Pro
  if (!isPro) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <Palette className="h-6 w-6 text-amber-600" />
            </div>
            <DialogTitle className="font-display text-xl leading-tight tracking-tight">
              Print Studio
            </DialogTitle>
            <DialogDescription className="text-sand-600">
              A keepsake itinerary, designed by AI around this trip — with its own
              palette, typefaces, and a caption for every day.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <div className="rounded-card border-2 border-earth-500 bg-sand-50/60 p-4">
              <div className="mb-3 flex items-end justify-between gap-2">
                <span className="font-display text-lg leading-tight tracking-tight text-foreground">
                  WanderLuxe Pro
                </span>
                <div className="text-right leading-none">
                  <span className="font-display text-2xl tracking-tight tabular-nums text-foreground">$3.99</span>
                  <span className="text-sm text-muted-foreground"> / month</span>
                </div>
              </div>
              <ul className="space-y-2">
                {[
                  'A custom theme designed for each trip',
                  'Every activity, stay, and reservation included',
                  'Print it, or save as a beautiful PDF',
                  'Cancel anytime',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-earth-600">
                    <Check className="h-4 w-4 flex-shrink-0 text-green-600" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            {editionList}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button variant="sunset" onClick={handleUpgrade} disabled={isUpgrading} className="w-full">
              {isUpgrading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Unlock the Print Studio
            </Button>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="w-full text-muted-foreground hover:text-foreground"
            >
              Not now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ------------------------------------------------------------------- Pro
  return (
    <Dialog open={open} onOpenChange={(next) => !isGenerating && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl leading-tight tracking-tight">
            <Palette className="h-5 w-5 text-earth-600" />
            Print Studio
          </DialogTitle>
          <DialogDescription className="text-sand-600">
            The AI reads everything on this trip and designs a printable keepsake
            edition — theme, palette, typefaces, and a caption for every day.
          </DialogDescription>
        </DialogHeader>

        {isGenerating ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-sand-400" />
            <p className="text-sm text-earth-600">{GENERATING_LINES[generatingLine]}</p>
            <p className="text-xs text-muted-foreground">This usually takes under a minute.</p>
          </div>
        ) : (
          <div className="space-y-4 py-1">
            <div>
              <label htmlFor="print-theme" className="mb-1.5 block text-sm font-medium text-foreground">
                Theme <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="print-theme"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                maxLength={300}
                placeholder="e.g. Riviera art deco, botanical field notes…"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Leave blank and the AI will pick a direction that fits the trip.
              </p>
            </div>
            {editionList}
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button variant="sunset" onClick={handleGenerate} disabled={isGenerating} className="w-full">
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {isGenerating ? 'Designing…' : 'Design my edition'}
          </Button>
          {!isGenerating && (
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="w-full text-muted-foreground hover:text-foreground"
            >
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PrintStudioDialog;
