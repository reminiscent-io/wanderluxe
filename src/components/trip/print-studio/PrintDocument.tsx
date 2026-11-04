// Print Studio document — an edition as a stack of Letter pages.
//
// Takes the design spec and the trip (src/lib/printDesign/trip.ts), plans the
// pages (src/lib/printDesign/plan.ts), draws them (./pages.tsx), and then
// checks them: after every render it measures each page for overflow
// (./fit.ts) and, when something ran off the paper, replans with that remedy.
// The loop only ever adds constraints, so it settles in a few passes, before
// the browser paints.
//
// Every itinerary item comes from the trip, so the document is complete
// regardless of what the model wrote; the design only styles and captions it.

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { getFontPairing, resolveFills, type PrintDesignSpec } from '@/lib/printDesign/spec';
import { planEdition, type EditionPlan } from '@/lib/printDesign/plan';
import type { PrintTrip } from '@/lib/printDesign/trip';
import { artPaletteOf } from './artInks';
import { measureOverflow } from './fit';
import {
  BackPage,
  ChapterPage,
  CoverPage,
  DayPage,
  DetailsPage,
  LedgerPage,
  OverviewPage,
  PairPage,
  type CopyRenderer,
  type PageEnv,
} from './pages';
import './printDocument.css';

export type { CopyRenderer } from './pages';

/** A safety stop for the fit loop; real editions settle in a handful of passes. */
const MAX_FIT_TOKENS = 240;

interface PrintDocumentProps {
  design: PrintDesignSpec;
  trip: PrintTrip;
  renderCopy?: CopyRenderer;
  /**
   * Reveal optional slots that are currently empty. Without this an edition
   * whose tagline the model left blank would have nowhere to type one.
   */
  isEditing?: boolean;
  /**
   * Add the Ledger (spend by category, against the trip budget). Off unless
   * the traveler opts in, so money never reaches a keepsake by default.
   */
  showBudget?: boolean;
  /**
   * Changing this re-runs pagination from the estimates: the fonts landing, an
   * edit saved. Between changes the fit only ever adds page breaks, so typing
   * in place never reshuffles pages that already fit.
   */
  layoutKey?: string;
  /** Called with the plan once every page fits (or the fit loop has done all it can). */
  onSettled?: (plan: EditionPlan) => void;
  /** Draw one page only, for a thumbnail: the cover, or the first page of days. */
  select?: 'all' | 'cover' | 'first-day';
}

const PrintDocument: React.FC<PrintDocumentProps> = ({
  design,
  trip,
  renderCopy,
  isEditing = false,
  showBudget = false,
  layoutKey = '',
  onSettled,
  select = 'all',
}) => {
  const copy: CopyRenderer = renderCopy ?? ((_key, value) => value);
  const pairing = getFontPairing(design.fontPairing);
  const { palette } = design;
  const layout = design.layout ?? 'editorial';
  const fills = resolveFills(palette);
  // Remedies belong to one version of the content: a refetch that shortens a
  // day must not keep the page break the longer day needed.
  const contentKey = useMemo(
    () =>
      trip.days
        .map((d) => `${d.date}:${d.items.length}:${d.items.reduce((n, i) => n + i.title.length + (i.notes?.length ?? 0) + (i.place?.length ?? 0), 0)}`)
        .join('|'),
    [trip]
  );
  const fitKey = `${layoutKey}|${showBudget ? 'b' : ''}|${contentKey}`;

  const [fit, setFit] = useState<{ key: string; tokens: string[]; settled: boolean }>({
    key: fitKey,
    tokens: [],
    settled: false,
  });
  const tokens = useMemo(() => (fit.key === fitKey ? fit.tokens : []), [fit, fitKey]);
  const settled = fit.key === fitKey && fit.settled;

  const plan = useMemo(
    () => planEdition(trip, design, { showBudget, feedback: tokens }),
    [trip, design, showBudget, tokens]
  );

  const rootRef = useRef<HTMLElement>(null);

  // Measure after every render, before paint: any render can change a page's
  // height (fonts, an edit, new trip data), so this deliberately has no
  // dependency list. It cannot loop: it only sets state when it finds a new
  // remedy or first settles, and tokens only ever grow (capped above).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const fresh = measureOverflow(root).filter((t) => !tokens.includes(t));
    if (fresh.length > 0 && tokens.length < MAX_FIT_TOKENS) {
      setFit({ key: fitKey, tokens: [...tokens, ...fresh], settled: false });
    } else if (!settled) {
      setFit({ key: fitKey, tokens, settled: true });
    }
  });

  useEffect(() => {
    if (settled) onSettled?.(plan);
    // onSettled is a callback prop; firing on its identity would loop a caller
    // that passes an inline function.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled, plan]);

  const fillVars: Record<string, string> = {};
  for (let i = 0; i < 4; i++) {
    const fill = fills[i % fills.length];
    fillVars[`--pd-fill-${i + 1}`] = fill.color;
    fillVars[`--pd-on-fill-${i + 1}`] = fill.text;
  }

  const styleVars = {
    '--pd-primary': palette.primary,
    '--pd-secondary': palette.secondary,
    '--pd-bg': palette.background,
    '--pd-surface': palette.surface,
    '--pd-ink': palette.ink,
    '--pd-muted': palette.muted,
    '--pd-accent': palette.accent,
    '--pd-display': pairing.display,
    '--pd-body': pairing.body,
    ...fillVars,
  } as React.CSSProperties;

  const env: PageEnv = {
    design,
    trip,
    plan,
    copy,
    isEditing,
    layout,
    art: artPaletteOf(palette),
    motif: design.motif,
    seed: `${design.themeName}|${design.motif}|${trip.startDate ?? ''}`,
    fills,
  };

  const firstDay = plan.pages.findIndex((p) => p.kind === 'day' || p.kind === 'pair');
  const shown =
    select === 'cover' ? [0] : select === 'first-day' ? [firstDay >= 0 ? firstDay : 0] : plan.pages.map((_, i) => i);

  return (
    <article
      ref={rootRef}
      className="print-doc"
      data-layout={layout}
      data-pages={plan.pages.length}
      data-settled={settled || undefined}
      style={styleVars}
      lang="en"
    >
      {shown.map((i) => {
        const page = plan.pages[i];
        const number = i + 1;
        switch (page.kind) {
          case 'cover':
            return <CoverPage key="cover" env={env} number={number} />;
          case 'overview':
            return <OverviewPage key={`overview-${page.part}`} env={env} page={page} number={number} />;
          case 'chapter':
            return <ChapterPage key={`chapter-${page.leg}`} env={env} leg={page.leg} number={number} />;
          case 'day':
            return <DayPage key={`day-${page.day}-${page.part}`} env={env} page={page} number={number} />;
          case 'pair':
            return <PairPage key={`pair-${page.days[0]}`} env={env} page={page} number={number} />;
          case 'details':
            return <DetailsPage key={`details-${page.part}`} env={env} page={page} number={number} />;
          case 'ledger':
            return <LedgerPage key="ledger" env={env} number={number} />;
          case 'back':
            return <BackPage key="back" env={env} number={number} />;
          default:
            return null;
        }
      })}
    </article>
  );
};

export default PrintDocument;
