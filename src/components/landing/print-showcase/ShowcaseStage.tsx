// The landing page's Print Studio demonstration.
//
// Five steps over one sheet of paper: the plan as a timeline, the free PDF of
// it, the designed edition, the words being rewritten, and the finished thing.
// It runs the product's own renderer over committed fixture data, so it cannot
// drift from what the Studio actually prints, and the editing is the real
// editing component rather than a picture of it.

import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { BedDouble, Compass, Plane, UtensilsCrossed } from 'lucide-react';
import PrintDocument from '@/components/trip/print-studio/PrintDocument';
import EditableCopy from '@/components/trip/print-studio/EditableCopy';
import PageThumbnail from '@/components/trip/print-studio/PageThumbnail';
import { useGoogleFonts } from '@/components/trip/print-studio/useGoogleFonts';
import { getFontPairing, type PrintDesignSpec } from '@/lib/printDesign/spec';
import { applyCopyOverrides, type PrintCopyOverrides } from '@/lib/printDesign/edits';
import type { PdfTripData } from '@/services/pdf/types';
import { cn } from '@/lib/utils';
import editionsJson from './tokyoEditions.json';
import tripJson from './tokyoTrip.json';

const TRIP = tripJson as unknown as PdfTripData;
const EDITIONS = editionsJson as unknown as PrintDesignSpec[];

export const SHOWCASE_STEPS = [
  { id: 'timeline', label: 'Your timeline' },
  { id: 'pdf', label: 'Simple PDF' },
  { id: 'edition', label: 'Studio edition' },
  { id: 'words', label: 'Your words' },
  { id: 'print', label: 'Print' },
] as const;

type StepId = (typeof SHOWCASE_STEPS)[number]['id'];

/** What a screen reader is told the sheet is, on every step that shows it. */
const SHEET_LABEL = 'A Print Studio edition of a sample trip to Tokyo';

/** One panel for all five steps, so every tab points at the same region. */
const PANEL_ID = 'print-showcase-panel';

// Both axes, because the rail really is both: a horizontal strip on a phone and
// a column beside the sheet from md up. Whichever arrow a visitor reaches for is
// the right one.
const STEP_DELTAS: Record<string, number> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

const ROW_ICONS = {
  transportation: Plane,
  accommodation: BedDouble,
  activity: Compass,
  dining: UtensilsCrossed,
} as const;

/** Day one as the app shows it — the state every traveler starts from. */
const TimelineRows: React.FC = () => (
  <ul className="m-0 list-none space-y-3 p-0">
    {TRIP.days[0].items.map((item) => {
      const Icon = ROW_ICONS[item.type];
      return (
        <li
          key={`${item.time}-${item.title}`}
          className="flex items-start gap-3 rounded-card border border-earth-100 bg-sand-50 p-3"
        >
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-earth-200 text-earth-500">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block font-sans text-sm font-medium text-earth-600">{item.title}</span>
            <span className="block font-sans text-xs text-earth-500">{item.time}</span>
          </span>
        </li>
      );
    })}
  </ul>
);

const ShowcaseStage: React.FC = () => {
  const prefersReduced = useReducedMotion();
  const [step, setStep] = useState<StepId>('timeline');
  const [editionIndex, setEditionIndex] = useState(0);
  const [overrides, setOverrides] = useState<PrintCopyOverrides>({});
  const tookOver = useRef(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const baseDesign = EDITIONS[editionIndex];
  const design = applyCopyOverrides(baseDesign, overrides);
  useGoogleFonts(getFontPairing(design.fontPairing).googleQuery);

  // One short run to the edition, so a visitor who only scrolls past still
  // sees the plain page become a designed one. Their first interaction ends it.
  useEffect(() => {
    if (prefersReduced) return;
    const timers = [
      window.setTimeout(() => !tookOver.current && setStep('pdf'), 1800),
      window.setTimeout(() => !tookOver.current && setStep('edition'), 4000),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [prefersReduced]);

  const go = (id: StepId) => {
    tookOver.current = true;
    setStep(id);
  };

  const onStepKeyDown = (e: React.KeyboardEvent, index: number) => {
    const delta = STEP_DELTAS[e.key] ?? 0;
    if (!delta) return;
    e.preventDefault();
    const nextIndex = (index + delta + SHOWCASE_STEPS.length) % SHOWCASE_STEPS.length;
    go(SHOWCASE_STEPS[nextIndex].id);
    // Focus has to follow selection: with a roving tabindex the pressed tab
    // drops out of the tab order, and leaving focus on it would make every
    // further arrow press recompute from the same index and go nowhere.
    tabRefs.current[nextIndex]?.focus();
  };

  const editable = (key: string, label: string, max: number) => (value: string) => {
    const current = overrides[key] ?? value;
    return (
      <EditableCopy
        fieldKey={key}
        value={current}
        onChange={(next) => setOverrides((prev) => ({ ...prev, [key]: next }))}
        max={max}
        label={label}
        placeholder={label}
        edited={overrides[key] !== undefined}
        onRevert={
          overrides[key] !== undefined
            ? () =>
                setOverrides((prev) => {
                  const { [key]: _dropped, ...rest } = prev;
                  return rest;
                })
            : undefined
        }
      />
    );
  };

  const renderCopy = (key: string, value: string) => {
    if (key === 'cover.title') return editable('cover.title', 'Cover title', 80)(value);
    if (key === 'cover.tagline') return editable('cover.tagline', 'Cover tagline', 160)(value);
    const firstCaption = `day.${TRIP.days[0].date}`;
    if (key === firstCaption) return editable(firstCaption, 'Day caption', 140)(value);
    return value;
  };

  // Every step but the editing one shows the sheet as a picture: scaled to the
  // frame, out of the accessibility tree, with the label standing in for it.
  const sheetPicture = (
    <PageThumbnail label={SHEET_LABEL} aspect={1.15} className="w-full">
      <PrintDocument design={design} data={TRIP} />
    </PageThumbnail>
  );

  // The editing step cannot go through PageThumbnail, and that is by design:
  // that frame is deliberately a picture — aria-hidden, pointer-events-none —
  // so a field inside it could be neither clicked nor heard. So the words step
  // gets the real document at real size, in a frame that scrolls. The type is
  // legible, the fields take a caret, and the revert button is announced.
  const sheetEditor = (
    <div
      role="region"
      aria-label={`${SHEET_LABEL}, with its words open for editing`}
      tabIndex={0}
      className="max-h-[32rem] overflow-y-auto rounded-card border border-border bg-background shadow-warm-sm"
    >
      {/* isEditing keeps a blanked optional slot on the page. Without it,
          backspacing out the tagline or a caption to rewrite it would unmount
          the field and its revert button together. */}
      <PrintDocument design={design} data={TRIP} renderCopy={renderCopy} isEditing />
    </div>
  );

  return (
    <div className="grid gap-6 md:grid-cols-[14rem_1fr] md:gap-10">
      {/* Mobile: a snap rail — five steps will not fit a segmented control at
          375px. sm+: a column beside the sheet. */}
      <div
        role="tablist"
        aria-label="Print Studio steps"
        aria-orientation="vertical"
        // Reaching the rail by keyboard is an interaction too. A timer that
        // moved the selection off the focused tab would send the next arrow
        // press to the step already showing.
        onFocus={() => {
          tookOver.current = true;
        }}
        className="-mx-6 flex snap-x gap-2 overflow-x-auto px-6 md:mx-0 md:flex-col md:gap-1 md:overflow-visible md:px-0"
      >
        {SHOWCASE_STEPS.map((s, i) => {
          const selected = s.id === step;
          return (
            <button
              key={s.id}
              ref={(node) => {
                tabRefs.current[i] = node;
              }}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={PANEL_ID}
              tabIndex={selected ? 0 : -1}
              onClick={() => go(s.id)}
              onKeyDown={(e) => onStepKeyDown(e, i)}
              className={cn(
                'shrink-0 snap-start rounded-full border px-4 py-2 text-left font-sans text-sm transition-colors md:rounded-card',
                selected
                  ? 'border-earth-600 bg-earth-600 text-sand-50'
                  : 'border-border bg-background text-earth-500 hover:border-earth-300 hover:text-earth-600'
              )}
            >
              {/* Quieter by size, not by opacity: at text-xs, opacity-70 over
                  either tab fill lands near 3:1, and every text element here
                  has to clear AA (DESIGN.md). */}
              <span className="tabular-nums text-xs">{String(i + 1).padStart(2, '0')}</span>{' '}
              <span className="ml-1.5">{s.label}</span>
            </button>
          );
        })}
      </div>

      <div id={PANEL_ID} role="tabpanel" aria-label={SHOWCASE_STEPS.find((s) => s.id === step)!.label}>
        {step === 'timeline' && <TimelineRows />}

        {step === 'pdf' && (
          <figure className="m-0">
            <img
              src="/images/print-showcase-simple-pdf.png"
              alt="A page of a simple PDF itinerary for a trip to Tokyo: three days of times, places and costs, followed by a budget summary"
              className="block h-auto w-full rounded-card border border-border shadow-warm-sm"
              loading="lazy"
              decoding="async"
            />
            <figcaption className="mt-3 font-sans text-sm text-earth-500">
              Free on every trip: the whole itinerary, typeset and ready to print.
            </figcaption>
          </figure>
        )}

        {step !== 'timeline' && step !== 'pdf' && (
          <div className="space-y-4">
            {step === 'words' ? sheetEditor : sheetPicture}

            {step === 'edition' && (
              <div role="group" aria-label="Sample editions" className="flex flex-wrap gap-2">
                {EDITIONS.map((e, i) => (
                  <button
                    key={e.themeName}
                    type="button"
                    aria-pressed={i === editionIndex}
                    onClick={() => {
                      tookOver.current = true;
                      setEditionIndex(i);
                    }}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-full border px-3 py-2 font-sans text-sm transition-colors',
                      i === editionIndex
                        ? 'border-earth-600 text-earth-600'
                        : 'border-border text-earth-500 hover:border-earth-300'
                    )}
                  >
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ background: e.palette.primary }}
                      aria-hidden
                    />
                    {e.themeName}
                  </button>
                ))}
              </div>
            )}

            {step === 'words' && (
              <p className="font-sans text-sm text-earth-500">
                Click any highlighted line and rewrite it. Nothing here is saved; on your own trip,
                every edit is kept and the AI's version is one click away.
              </p>
            )}

            {step === 'print' && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="rounded-full border border-earth-200 px-3 py-1 font-sans text-xs uppercase tracking-widest text-earth-500">
                  Finalized
                </span>
                <span className="font-sans text-sm text-earth-500">
                  Freeze it when the plan is set, print copies, and everyone on the trip can open it.
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShowcaseStage;
