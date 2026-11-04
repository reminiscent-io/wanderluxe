// Print Studio pages — one component per kind of Letter page.
//
// Each page is a fixed 8.5 × 11 in sheet (816 × 1056 CSS px). What goes on
// which sheet was decided by the plan (src/lib/printDesign/plan.ts); these
// components only draw it. Pages that can run long put their content in a
// region marked data-pd-flow, one data-pd-block per unit, so the overflow
// check in ./fit.ts can tell PrintDocument where a page ran out of paper.
//
// Every itinerary word on these pages comes from the trip itself. The design
// supplies colour, type, art and the editorial lines (cover, headlines,
// captions, intro, sign-off), all of which pass through `copy` so the edition
// page can make them editable in place.

import React, { useLayoutEffect, useRef, useState } from 'react';
import {
  BedDouble,
  BusFront,
  CarFront,
  Compass,
  Plane,
  Route,
  Ship,
  TrainFront,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import { fmtMoney } from '@/services/pdf/format';
import { contrastRatio } from '@/lib/printDesign/color';
import { themeNameEndsInEdition, type MotifId, type PrintDesignSpec, type PrintFill } from '@/lib/printDesign/spec';
import type { DetailRow, EditionPlan, PlanPage } from '@/lib/printDesign/plan';
import type { PrintDay, PrintImage, PrintItem, PrintTrip } from '@/lib/printDesign/trip';
import { monthDay, shortMonthDay, weekdayOf } from '@/lib/printDesign/dates';
import { ArtCorner, ArtField, ArtFrieze, ArtMark } from './art';
import { friezeMode, inksFor, type ArtPalette } from './artInks';

/** Wraps one editable copy slot; plain text unless the edition page opts in. */
export type CopyRenderer = (key: string, value: string) => React.ReactNode;

/** Everything a page needs to draw itself. */
export interface PageEnv {
  design: PrintDesignSpec;
  trip: PrintTrip;
  plan: EditionPlan;
  copy: CopyRenderer;
  isEditing: boolean;
  layout: 'editorial' | 'bold';
  art: ArtPalette;
  motif: MotifId;
  /** Seeds the art, so an edition draws the same pictures every time. */
  seed: string;
  fills: PrintFill[];
}

/* =========================================================================
   Shared pieces
   ========================================================================= */

const SHEET_W = 816;

function fillFor(env: PageEnv, index: number): PrintFill {
  return env.fills[index % env.fills.length];
}

/**
 * A day's colour as type on the paper: its fill when that reads at display
 * size (3:1, the large-text floor), the palette's primary otherwise. Fills have
 * no floor against the page, so a pale gold numeral would otherwise vanish.
 */
function dayInkOnPaper(env: PageEnv, index: number): string {
  const fill = fillFor(env, index).color;
  return contrastRatio(fill, env.design.palette.background) >= 3 ? fill : env.design.palette.primary;
}

function dayVars(env: PageEnv, index: number): React.CSSProperties {
  const fill = fillFor(env, index);
  return {
    '--pd-day-fill': fill.color,
    '--pd-day-on-fill': fill.text,
    '--pd-day-ink': dayInkOnPaper(env, index),
  } as React.CSSProperties;
}

const WEEKDAY_SHORT = (iso: string) => weekdayOf(iso).slice(0, 3);

/** The headline a day prints under: the design's (edits included), else the traveler's own title. */
function headlineFor(design: PrintDesignSpec, day: PrintDay): string {
  const own = design.dayHeadlines?.[day.date];
  return own !== undefined ? own : (day.title ?? '');
}

/** One short line per item, for the overview. */
function summaryOf(item: PrintItem): string {
  if (item.kind === 'stay') return `${item.label === 'Check-out' ? 'Check out' : 'Check in'}: ${item.title}`;
  if (item.kind === 'journey' && item.title === 'Rental car' && item.label) return `Rental car ${item.label.toLowerCase()}`;
  return item.title;
}

const KIND_LABEL: Record<PrintItem['kind'], string> = {
  stay: 'Stay',
  journey: 'Journey',
  activity: 'Plan',
  dining: 'Reservation',
};

function iconFor(item: PrintItem): LucideIcon {
  if (item.kind === 'stay') return BedDouble;
  if (item.kind === 'dining') return UtensilsCrossed;
  if (item.kind === 'activity') return Compass;
  switch (item.mode) {
    case 'flight':
      return Plane;
    case 'train':
      return TrainFront;
    case 'bus':
    case 'transfer':
      return BusFront;
    case 'car':
      return CarFront;
    case 'ferry':
      return Ship;
    default:
      return Route;
  }
}

interface SheetProps {
  kind: PlanPage['kind'];
  number: number;
  className?: string;
  style?: React.CSSProperties;
  dates?: string[];
  /** Fit state, read back by ./fit.ts so a page is tightened before it is split. */
  compact?: boolean;
  tight?: boolean;
  children: React.ReactNode;
}

function Sheet({ kind, number, className, style, dates, compact, tight, children }: SheetProps) {
  return (
    <section
      className={`pd-sheet pd-sheet--${kind}${tight ? ' pd-sheet--tight' : ''}${className ? ` ${className}` : ''}`}
      data-pd-kind={kind}
      data-pd-dates={dates?.join(',')}
      data-pd-compact={compact || undefined}
      data-pd-tight={tight || undefined}
      data-pd-page={number}
      aria-label={`Page ${number}`}
      style={style}
    >
      {children}
    </section>
  );
}

/** The running foot: what this is, and which page. */
function Foot({ env, number, label }: { env: PageEnv; number: number; label?: string }) {
  return (
    <footer className="pd-foot">
      <span className="pd-foot-title">{env.design.cover.title}</span>
      {label && <span className="pd-foot-label">{label}</span>}
      <span className="pd-foot-num">{number}</span>
    </footer>
  );
}

/**
 * A photograph at its own proportions. Sized to fit the box it is given,
 * never cropped to it: the traveler chose the whole picture.
 */
function Photo({
  image,
  maxWidth,
  maxHeight,
  alt,
  className,
}: {
  image: PrintImage;
  maxWidth: number;
  maxHeight: number;
  alt: string;
  className?: string;
}) {
  const known = !!(image.width && image.height);
  const aspect = known ? image.width! / image.height! : 3 / 2;
  let width = maxWidth;
  let height = width / aspect;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspect;
  }
  return (
    <figure className={`pd-photo${className ? ` ${className}` : ''}`}>
      <img
        src={image.url}
        alt={alt}
        width={Math.round(width)}
        height={Math.round(height)}
        style={{ width: Math.round(width), height: Math.round(height), objectFit: known ? undefined : 'contain' }}
        decoding="sync"
      />
    </figure>
  );
}

/* =========================================================================
   Items
   ========================================================================= */

function ItemRow({ item, block }: { item: PrintItem; block: string }) {
  const Icon = iconFor(item);
  const hasMeta = item.facts.length > 0 || item.links.length > 0;
  return (
    <li className={`pd-item pd-item--${item.kind}`} data-pd-block={block}>
      <div className="pd-item-when">
        {item.time && <span className="pd-item-time">{item.time}</span>}
        {item.endTime && <span className="pd-item-end">to {item.endTime}</span>}
      </div>
      <span className="pd-item-node" aria-hidden>
        <Icon />
      </span>
      <div className="pd-item-body">
        <span className="pd-sr-only">{KIND_LABEL[item.kind]}: </span>
        {item.label && <p className="pd-item-label">{item.label}</p>}
        <p className="pd-item-title">{item.title}</p>
        {item.place && <p className="pd-item-place">{item.place}</p>}
        {item.notes && <p className="pd-item-notes">{item.notes}</p>}
        {hasMeta && (
          <p className="pd-item-meta">
            {item.facts.map((fact) => (
              <span key={fact} className="pd-item-fact">
                {fact}
              </span>
            ))}
            {item.links.map((link) => (
              <a key={link.href} className="pd-item-link" href={link.href}>
                {link.label === link.display ? link.display : `${link.label}: ${link.display}`}
              </a>
            ))}
          </p>
        )}
      </div>
    </li>
  );
}

/* =========================================================================
   Day header
   ========================================================================= */

interface DayHeadProps {
  env: PageEnv;
  day: PrintDay;
  variant: 'solo' | 'pair' | 'feature';
  part?: number;
  /** Leg banner for a short multi-place trip: the place, on the day it begins. */
  banner?: string;
}

function DayHead({ env, day, variant, part = 1, banner }: DayHeadProps) {
  const { design, copy, isEditing, trip } = env;
  const headline = headlineFor(design, day);
  const caption = design.dayCaptions[day.date] ?? '';
  const continued = part > 1;
  const showHeadline = !continued && (headline || isEditing);
  const showCaption = !continued && (caption || isEditing);
  const dayNumber = day.index + 1;

  return (
    <header className={`pd-dayhead pd-dayhead--${variant}`}>
      <div className="pd-dayhead-num" aria-hidden>
        <span className="pd-dayhead-kicker">Day</span>
        <span className="pd-dayhead-numeral">{dayNumber}</span>
      </div>
      <div className="pd-dayhead-text">
        <p className="pd-dayhead-date">
          <span className="pd-sr-only">Day {dayNumber}, </span>
          {day.weekday}, {monthDay(day.date)}
          {trip.days.length > 1 && <span className="pd-dayhead-of"> · Day {dayNumber} of {trip.days.length}</span>}
          {continued && <span className="pd-dayhead-of"> · continued</span>}
        </p>
        {banner && !continued && <p className="pd-dayhead-banner">{banner}</p>}
        {showHeadline && <h2 className="pd-dayhead-title">{copy(`headline.${day.date}`, headline)}</h2>}
        {showCaption && <p className="pd-dayhead-caption">{copy(`day.${day.date}`, caption)}</p>}
        {!continued && day.stay && (
          <p className="pd-dayhead-stay">
            <BedDouble aria-hidden />
            <span>Tonight: {day.stay}</span>
          </p>
        )}
      </div>
    </header>
  );
}

function DayItems({ day, from, to }: { day: PrintDay; from: number; to: number }) {
  const items = day.items.slice(from, to);
  // A header page of a busy day: its schedule starts on the next page.
  if (items.length === 0 && day.items.length > 0) return null;
  if (items.length === 0) {
    return (
      <p className="pd-day-open" data-pd-block={`day:${day.date}:${from}`}>
        Nothing planned for this day yet.
      </p>
    );
  }
  return (
    <ol className="pd-items">
      {items.map((item, i) => (
        <ItemRow key={`${day.date}-${from + i}`} item={item} block={`day:${day.date}:${from + i}`} />
      ))}
    </ol>
  );
}

/** Below this a gap is a margin, not a space for a picture. */
const ART_MIN_GAP = 110;
/** The tallest a frieze grows; a bigger gap keeps the rest as white paper. */
const ART_MAX_HEIGHT = 340;

/**
 * Art for whatever height a page leaves under its last item, composed for
 * that height: a frieze along the foot of the page, nothing in a sliver.
 * Measured in layout pixels (clientHeight), so a scaled preview draws the same
 * picture as the printed page.
 */
function ArtFill({ env, seed }: { env: PageEnv; seed: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [gap, setGap] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setGap(el.clientHeight);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const inks = inksFor(env.motif, env.art);
  const height = Math.min(gap, ART_MAX_HEIGHT);
  const art =
    gap >= ART_MIN_GAP ? (
      <ArtFrieze motif={env.motif} inks={inks} seed={seed} width={SHEET_W} height={height} edge="bottom" className="pd-artfill-art" />
    ) : null;
  return (
    <div ref={ref} className="pd-artfill" aria-hidden>
      {art}
    </div>
  );
}

/* =========================================================================
   Pages
   ========================================================================= */

export function CoverPage({ env, number }: { env: PageEnv; number: number }) {
  const { design, trip, copy, isEditing, layout } = env;
  const bold = layout === 'bold';
  const ground = bold ? fillFor(env, 0).color : env.art.paper;
  const inks = inksFor(env.motif, env.art, ground);
  const titleLength = design.cover.title.length;
  const titleSize = titleLength <= 16 ? 'xl' : titleLength <= 30 ? 'lg' : titleLength <= 48 ? 'md' : 'sm';
  const photo = trip.cover?.url ? trip.cover : null;
  // A trip with no overview page carries its intro on the cover.
  const introHere = !env.plan.pages.some((p) => p.kind === 'overview') && (design.intro || isEditing);

  return (
    <Sheet kind="cover" number={number} className={bold ? 'pd-sheet--fill' : undefined}>
      {bold ? (
        <ArtField motif={env.motif} inks={inks} seed={`${env.seed}:cover`} width={SHEET_W} height={1056} className="pd-cover-field" size={[90, 160]} density={0.58} />
      ) : (
        <CoverTop env={env} seed={`${env.seed}:cover-top`} />
      )}
      <div className={`pd-cover-card${photo ? ' pd-cover-card--photo' : ''}`}>
        {trip.dateRange && <p className="pd-cover-kicker">{trip.dateRange}</p>}
        <h1 className={`pd-cover-title pd-cover-title--${titleSize}`}>{copy('cover.title', design.cover.title)}</h1>
        {(design.cover.tagline || isEditing) && <p className="pd-cover-tagline">{copy('cover.tagline', design.cover.tagline)}</p>}
        {(design.cover.subtitle || isEditing) && (
          <p className="pd-cover-route">
            <span>{copy('cover.subtitle', design.cover.subtitle)}</span>
          </p>
        )}
        {introHere && <p className="pd-cover-intro">{copy('intro', design.intro)}</p>}
        {photo && (
          <Photo
            image={photo}
            maxWidth={bold ? 520 : 560}
            maxHeight={introHere ? 260 : bold ? 330 : 360}
            alt={trip.destination ? `Photograph for ${trip.destination}` : ''}
            className="pd-cover-photo"
          />
        )}
      </div>
      {!bold && (
        <ArtFrieze motif={env.motif} inks={inks} seed={`${env.seed}:cover-foot`} width={SHEET_W} height={photo ? 170 : 400} edge="bottom" className="pd-cover-frieze" />
      )}
      <p className="pd-cover-credit">A WanderLuxe Print Studio edition</p>
    </Sheet>
  );
}

/**
 * The art across the top of a paper cover: the motif's own frieze, except for
 * things that stand on the ground (trees, mountains, waves), which would hang
 * upside down there. Those take the two top corners instead.
 */
function CoverTop({ env, seed }: { env: PageEnv; seed: string }) {
  const inks = inksFor(env.motif, env.art);
  if (friezeMode(env.motif) === 'ground') {
    return (
      <>
        <ArtCorner motif={env.motif} inks={inks} seed={`${seed}:l`} width={260} height={260} corner="top-left" className="pd-corner pd-corner--tl" />
        <ArtCorner motif={env.motif} inks={inks} seed={`${seed}:r`} width={260} height={260} corner="top-right" className="pd-corner pd-corner--tr" />
        <div className="pd-cover-spacer" aria-hidden />
      </>
    );
  }
  return <ArtFrieze motif={env.motif} inks={inks} seed={seed} width={SHEET_W} height={200} edge="top" className="pd-cover-frieze" />;
}

function DetailsRows({ env, rows }: { env: PageEnv; rows: Array<{ row: DetailRow; index: number }> }) {
  const { trip } = env;
  let lastSection: DetailRow['section'] | null = null;
  const heading: Record<DetailRow['section'], string> = {
    journeys: 'Getting there and around',
    stays: 'Where you are staying',
    reservations: 'Reservations',
  };
  return (
    <>
      {rows.map(({ row, index }) => {
        const head = row.section !== lastSection ? heading[row.section] : null;
        lastSection = row.section;
        return (
          <div key={`${row.section}-${row.index}`} className="pd-detail" data-pd-block={`details:${index}`}>
            {head && <h3 className="pd-detail-section">{head}</h3>}
            {row.section === 'journeys' && <JourneyDetail journey={trip.journeys[row.index]} />}
            {row.section === 'stays' && <StayDetail stay={trip.stays[row.index]} />}
            {row.section === 'reservations' && <ReservationDetail reservation={trip.reservations[row.index]} />}
          </div>
        );
      })}
    </>
  );
}

/** Date over time, in the narrow first column of a bookings row. */
function When({ date, time }: { date?: string; time?: string }) {
  return (
    <p className="pd-detail-when">
      {date && <span>{`${WEEKDAY_SHORT(date)}, ${shortMonthDay(date)}`}</span>}
      {time && <span className="pd-detail-time">{time}</span>}
    </p>
  );
}

function Code({ label, value }: { label: string; value?: string }) {
  if (!value) return <span />;
  return (
    <p className="pd-detail-code">
      <span>{label}</span>
      {value}
    </p>
  );
}

function JourneyDetail({ journey: j }: { journey: PrintTrip['journeys'][number] }) {
  const name = [j.label, j.provider, j.number].filter(Boolean).join(' · ');
  const places = [...new Set([j.from, j.to].filter(Boolean))].join(' → ');
  const arrives = j.endTime
    ? j.endDate
      ? `until ${WEEKDAY_SHORT(j.endDate)}, ${shortMonthDay(j.endDate)}, ${j.endTime}`
      : `arrives ${j.endTime}`
    : '';
  const sub = [places, arrives].filter(Boolean).join(' · ');
  return (
    <div className="pd-detail-row">
      <When date={j.date} time={j.time} />
      <div className="pd-detail-main">
        <p className="pd-detail-name">{name}</p>
        {sub && <p className="pd-detail-sub">{sub}</p>}
      </div>
      <Code label="Confirmation" value={j.confirmation} />
    </div>
  );
}

function StayDetail({ stay: s }: { stay: PrintTrip['stays'][number] }) {
  const nights = [s.checkIn && shortMonthDay(s.checkIn), s.checkOut && shortMonthDay(s.checkOut)].filter(Boolean).join(' – ');
  const times = [s.checkInTime && `check-in ${s.checkInTime}`, s.checkOutTime && `check-out ${s.checkOutTime}`].filter(Boolean).join(', ');
  return (
    <div className="pd-detail-row">
      <p className="pd-detail-when">
        <span>{nights}</span>
      </p>
      <div className="pd-detail-main">
        <p className="pd-detail-name">{s.name}</p>
        {(s.address || times) && <p className="pd-detail-sub">{[s.address, times].filter(Boolean).join(' · ')}</p>}
      </div>
      <Code label="Phone" value={s.phone} />
    </div>
  );
}

function ReservationDetail({ reservation: r }: { reservation: PrintTrip['reservations'][number] }) {
  const sub = [r.address, r.party && `Party of ${r.party}`, r.confirmation ? r.phone : undefined].filter(Boolean).join(' · ');
  return (
    <div className="pd-detail-row">
      <When date={r.date} time={r.time} />
      <div className="pd-detail-main">
        <p className="pd-detail-name">{r.name}</p>
        {sub && <p className="pd-detail-sub">{sub}</p>}
      </div>
      {r.confirmation ? <Code label="Confirmation" value={r.confirmation} /> : <Code label="Phone" value={r.phone} />}
    </div>
  );
}

export function OverviewPage({ env, page, number }: { env: PageEnv; page: Extract<PlanPage, { kind: 'overview' }>; number: number }) {
  const { design, trip, plan, copy, isEditing } = env;
  const first = page.part === 1;
  const inks = inksFor(env.motif, env.art);
  const multiPlace = plan.analysis.legs.length >= 2;
  const placeOf = (date: string) => design.dayPlaces?.[date];

  return (
    <Sheet kind="overview" number={number} compact={page.compact}>
      <ArtCorner motif={env.motif} inks={inks} seed={`${env.seed}:overview-${page.part}`} width={250} height={250} corner="top-right" className="pd-corner pd-corner--tr" />
      <header className="pd-pagehead">
        <p className="pd-kicker">
          {first ? ['The trip at a glance', trip.dateRange].filter(Boolean).join(' · ') : 'At a glance, continued'}
        </p>
        {first && <h2 className="pd-pagehead-title pd-pagehead-title--glance">{trip.destination}</h2>}
      </header>
      {first && (design.intro || isEditing) && <p className="pd-intro">{copy('intro', design.intro)}</p>}
      <div className="pd-flow" data-pd-flow>
        <ol className={`pd-glance${page.compact ? ' pd-glance--compact' : ''}`}>
          {trip.days.slice(page.from, page.to).map((day) => {
            const i = day.index;
            const headline = headlineFor(design, day);
            const summary = day.items.filter((it) => !(it.kind === 'stay' && it.label === 'Check-out')).map(summaryOf);
            const shown = summary.slice(0, 4).join(' · ') + (summary.length > 4 ? ` · and ${summary.length - 4} more` : '');
            return (
              <li key={day.date} className="pd-glance-row" data-pd-block={`overview:${i}`} style={dayVars(env, i)}>
                <span className="pd-glance-num" aria-hidden>
                  {i + 1}
                </span>
                <div className="pd-glance-text">
                  <p className="pd-glance-date">
                    {day.weekday}, {monthDay(day.date)}
                    {multiPlace && placeOf(day.date) && <span className="pd-glance-place"> · {placeOf(day.date)}</span>}
                  </p>
                  {headline && <p className="pd-glance-title">{headline}</p>}
                  <p className="pd-glance-items">{shown || 'Nothing booked yet'}</p>
                </div>
                <span className="pd-glance-page">p. {plan.dayPages[i]}</span>
              </li>
            );
          })}
        </ol>
        {page.details && (
          <section className="pd-glance-bookings" data-pd-block="details-panel">
            <h3 className="pd-glance-bookings-title">Bookings</h3>
            <DetailsRows env={env} rows={plan.detailRows.map((row, index) => ({ row, index }))} />
          </section>
        )}
        <ArtFill env={env} seed={`${env.seed}:overview-${page.part}:fill`} />
      </div>
      <Foot env={env} number={number} />
    </Sheet>
  );
}

const ORDINALS = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'];

export function ChapterPage({ env, leg, number }: { env: PageEnv; leg: number; number: number }) {
  const { trip, plan } = env;
  const l = plan.analysis.legs[leg];
  const fill = fillFor(env, leg);
  const inks = inksFor(env.motif, env.art, fill.color);
  const first = trip.days[l.from];
  const last = trip.days[l.to];
  const days = l.to - l.from + 1;
  return (
    <Sheet kind="chapter" number={number} className="pd-sheet--fill" style={{ '--pd-sheet-fill': fill.color, '--pd-sheet-on-fill': fill.text } as React.CSSProperties}>
      <ArtField motif={env.motif} inks={inks} seed={`${env.seed}:chapter-${leg}`} width={SHEET_W} height={1056} className="pd-chapter-field" size={[80, 150]} density={0.5} />
      <div className="pd-chapter-card">
        <p className="pd-kicker">Part {ORDINALS[leg] ?? leg + 1}</p>
        <h2 className="pd-chapter-place">{l.place}</h2>
        <p className="pd-chapter-dates">
          {first.date === last.date ? monthDay(first.date) : `${monthDay(first.date)} – ${monthDay(last.date)}`} · {days} {days === 1 ? 'day' : 'days'}
        </p>
      </div>
      <Foot env={env} number={number} />
    </Sheet>
  );
}

export function DayPage({ env, page, number }: { env: PageEnv; page: Extract<PlanPage, { kind: 'day' }>; number: number }) {
  const { trip, plan, design } = env;
  const day = trip.days[page.day];
  const banner = bannerFor(env, page.day);
  const feature = page.feature && page.part === 1;
  const bold = env.layout === 'bold' || feature;
  const fill = fillFor(env, page.day);
  const bandInks = inksFor(env.motif, env.art, bold ? fill.color : env.art.paper);
  const photo = page.part === 1 && day.image?.url ? day.image : null;
  const place = design.dayPlaces?.[day.date];

  return (
    <Sheet
      kind="day"
      number={number}
      className={`${bold ? 'pd-sheet--band' : ''}${feature ? ' pd-sheet--feature' : ''}`}
      style={dayVars(env, page.day)}
      dates={[day.date]}
      tight={page.tight}
    >
      <div className="pd-band">
        <ArtCorner
          motif={env.motif}
          inks={bandInks}
          seed={`${env.seed}:${day.date}:${page.part}`}
          width={feature ? 340 : 270}
          height={feature ? 340 : 270}
          corner="top-right"
          className="pd-corner pd-corner--tr"
        />
        <DayHead env={env} day={day} variant={feature ? 'feature' : 'solo'} part={page.part} banner={banner} />
      </div>
      {photo && <Photo image={photo} maxWidth={688} maxHeight={250} alt={`Photograph for ${day.weekday}`} className="pd-day-photo" />}
      {page.part === 1 && day.description && <p className="pd-day-desc">{day.description}</p>}
      <div className="pd-flow" data-pd-flow>
        <DayItems day={day} from={page.from} to={page.to} />
        {page.part === page.parts && <ArtFill env={env} seed={`${env.seed}:${day.date}:fill`} />}
      </div>
      <Foot env={env} number={number} label={[place && plan.analysis.legs.length >= 2 ? place : '', `${day.weekday}, ${monthDay(day.date)}`].filter(Boolean).join(' · ')} />
    </Sheet>
  );
}

/** The place a day opens, when its leg is marked by a banner rather than a chapter page. */
function bannerFor(env: PageEnv, dayIndex: number): string | undefined {
  const { legs } = env.plan.analysis;
  const legIndex = legs.findIndex((l) => l.from === dayIndex);
  return legIndex >= 0 && env.plan.legBanners[legIndex] ? legs[legIndex].place || undefined : undefined;
}

export function PairPage({ env, page, number }: { env: PageEnv; page: Extract<PlanPage, { kind: 'pair' }>; number: number }) {
  const { trip } = env;
  const [a, b] = page.days.map((i) => trip.days[i]);
  const dividerInks = inksFor(env.motif, env.art);
  return (
    <Sheet kind="pair" number={number} dates={[a.date, b.date]}>
      <div className="pd-flow" data-pd-flow>
        {[a, b].map((day, k) => (
          <React.Fragment key={day.date}>
            {k === 1 && (
              <div className="pd-pair-divider" aria-hidden data-pd-block={`pair:${k}`}>
                <ArtMark motif={env.motif} inks={dividerInks} size={44} variant={day.index} />
              </div>
            )}
            <section className="pd-pair-day" style={dayVars(env, day.index)} data-pd-block={`pairday:${day.index}`}>
              <DayHead env={env} day={day} variant="pair" banner={bannerFor(env, day.index)} />
              {day.description && <p className="pd-day-desc">{day.description}</p>}
              <DayItems day={day} from={0} to={day.items.length} />
            </section>
          </React.Fragment>
        ))}
        <ArtFill env={env} seed={`${env.seed}:${a.date}:pair`} />
      </div>
      <Foot env={env} number={number} label={`${a.weekday} and ${b.weekday}`} />
    </Sheet>
  );
}

export function DetailsPage({ env, page, number }: { env: PageEnv; page: Extract<PlanPage, { kind: 'details' }>; number: number }) {
  const { plan } = env;
  const inks = inksFor(env.motif, env.art);
  const rows = plan.detailRows.slice(page.from, page.to).map((row, k) => ({ row, index: page.from + k }));
  return (
    <Sheet kind="details" number={number}>
      <ArtCorner motif={env.motif} inks={inks} seed={`${env.seed}:details-${page.part}`} width={230} height={230} corner="top-right" className="pd-corner pd-corner--tr" />
      <header className="pd-pagehead">
        <p className="pd-kicker">{page.part === 1 ? 'Keep this page handy' : 'Bookings, continued'}</p>
        {page.part === 1 && <h2 className="pd-pagehead-title">Bookings and contacts</h2>}
      </header>
      <div className="pd-flow" data-pd-flow>
        <div className="pd-details">
          <DetailsRows env={env} rows={rows} />
        </div>
        <ArtFill env={env} seed={`${env.seed}:details-${page.part}:fill`} />
      </div>
      <Foot env={env} number={number} />
    </Sheet>
  );
}

export function LedgerPage({ env, number }: { env: PageEnv; number: number }) {
  const { budget } = env.trip;
  return (
    <Sheet kind="ledger" number={number}>
      <header className="pd-pagehead">
        <p className="pd-kicker">The Ledger</p>
        <h2 className="pd-pagehead-title">What the trip costs</h2>
      </header>
      <div className="pd-ledger">
        {budget.categories.map((c) => (
          <div className="pd-ledger-row" key={c.category}>
            <span>{c.category}</span>
            <span className="pd-leader" />
            <span className="pd-ledger-amount">{fmtMoney(c.amount)}</span>
          </div>
        ))}
        <div className="pd-ledger-row pd-ledger-total">
          <span>Planned spend</span>
          <span className="pd-leader" />
          <span className="pd-ledger-amount">{fmtMoney(budget.total)}</span>
        </div>
        {budget.budget != null && <p className="pd-ledger-note">Against a trip budget of {fmtMoney(budget.budget)}.</p>}
      </div>
      <Foot env={env} number={number} />
    </Sheet>
  );
}

export function BackPage({ env, number }: { env: PageEnv; number: number }) {
  const { design, copy } = env;
  const bold = env.layout === 'bold';
  const ground = bold ? fillFor(env, 0).color : env.art.paper;
  const inks = inksFor(env.motif, env.art, ground);
  return (
    <Sheet kind="back" number={number} className={bold ? 'pd-sheet--fill' : undefined}>
      {bold ? (
        <ArtField motif={env.motif} inks={inks} seed={`${env.seed}:back`} width={SHEET_W} height={1056} className="pd-cover-field" size={[90, 160]} density={0.58} />
      ) : (
        <ArtFrieze motif={env.motif} inks={inks} seed={`${env.seed}:back-foot`} width={SHEET_W} height={300} edge="bottom" className="pd-cover-frieze pd-cover-frieze--bottom" />
      )}
      <div className="pd-back-card">
        <ArtMark motif={env.motif} inks={inksFor(env.motif, env.art)} size={84} variant={1} className="pd-back-mark" />
        <p className="pd-back-line">{copy('closing', design.closing)}</p>
        <p className="pd-back-credit">
          The {copy('themeName', design.themeName)}
          {themeNameEndsInEdition(design.themeName) ? null : ' edition'}
          <br />
          Made with WanderLuxe · wanderluxe.io
        </p>
      </div>
    </Sheet>
  );
}
