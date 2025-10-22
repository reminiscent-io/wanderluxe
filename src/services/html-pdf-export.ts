/*  src/services/html-pdf-export.ts
    Elegant 1–2 page itinerary export (hero image background with overlay)
    - Handlebars HTML -> Puppeteer PDF
    - Options: detailLevel, layout, showImages, showCosts, sections
    - ReDoS-safe time parsing + filename sanitizer
    - Hardened Puppeteer launcher for Replit/Bun
    ---------------------------------------------------------------------- */

import puppeteer, { LaunchOptions } from 'puppeteer';
import Handlebars from 'handlebars';
import type { Itinerary, ItineraryData } from '@/types/itinerary';
import { tripDataToItinerary } from '@/utils/itineraryUtils';
import type { PdfExportOptions } from '@/components/trip/PdfExportDialog';

/* =========================================================================
   ReDoS-safe helpers (no catastrophic regex)
   ========================================================================= */

const TIME_RE = /^\s*(\d{1,2})(?::(\d{2}))?\s*([ap])m\s*$/i; // "8:05 am" or "8 am"

function minsFromTime(s: string): number {
  const m = TIME_RE.exec(s);
  if (!m) return 9999;
  const hh = parseInt(m[1], 10) % 12;
  const mm = m[2] ? parseInt(m[2], 10) : 0;
  const mer = (m[3] || 'a').toLowerCase();
  return (mer === 'p' ? (hh + 12) : hh) * 60 + mm;
}

function sanitizeFilename(input?: string | null): string {
  const src = (input || 'itinerary').toLowerCase();
  let out = '';
  let prevUnderscore = false;
  for (let i = 0; i < src.length && out.length < 120; i++) {
    const ch = src[i];
    const c = ch.charCodeAt(0);
    const isAlnum = (c >= 48 && c <= 57) || (c >= 97 && c <= 122);
    if (isAlnum) { out += ch; prevUnderscore = false; }
    else if (!prevUnderscore) { out += '_'; prevUnderscore = true; }
  }
  while (out.startsWith('_')) out = out.slice(1);
  while (out.endsWith('_')) out = out.slice(0, -1);
  return out || 'itinerary';
}

/* =========================================================================
   Chromium/Puppeteer launcher hardened for Replit/Bun
   ========================================================================= */

function which(bin: string): string | undefined {
  try {
    const { execSync } = require('node:child_process');
    const out = execSync(`which ${bin}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    return out || undefined;
  } catch { return undefined; }
}

function resolveExecPath(): string | undefined {
  // a) explicit env override
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH!;
  // b) puppeteer bundled chromium (if downloaded)
  try {
    // @ts-ignore executablePath exists at runtime in Puppeteer
    const p = puppeteer.executablePath?.();
    if (p && typeof p === 'string') return p;
  } catch {}
  // c) common Replit/Nix locations
  const guesses = [
    '/run/current-system/sw/bin/chromium', // Nix/Replit
    which('chromium'),
    which('chromium-browser'),
    which('google-chrome'),
    which('google-chrome-stable'),
  ].filter(Boolean) as string[];
  return guesses[0];
}

function getLaunchOptions(): LaunchOptions {
  const executablePath = resolveExecPath();
  return {
    headless: 'new',
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-zygote',
      '--single-process',
      '--font-render-hinting=none',
      '--disable-features=site-per-process',
    ],
  };
}

/* =========================================================================
   Data shaping
   ========================================================================= */

type FlatItem = {
  dateLabel: string;
  time: string;                  // "08:00 AM – 11:45 AM" or "All-day"
  title: string;
  subtitle?: string;
  meta?: Array<{ icon?: string; label: string }>;
  thumb?: string;
  type?: 'transportation'|'accommodation'|'activity'|'dining';
  sortKey: number;               // dayIndex * 24*60 + minsFromTime(start)
};

const ICON: Record<string, string> = {
  transportation: '✈️',
  flight:         '✈️',
  accommodation:  '🏨',
  hotel:          '🏨',
  dining:         '🍽️',
  restaurant:     '🍽️',
  activity:       '🎯',
  activities:     '🎯',
};

function wantType(opt: PdfExportOptions, t?: FlatItem['type']): boolean {
  if (!t) return true;
  switch (t) {
    case 'transportation': return !!opt.sections.transportation;
    case 'accommodation':  return !!opt.sections.accommodation;
    case 'activity':       return !!opt.sections.activities;
    case 'dining':         return !!opt.sections.dining;
    default: return true;
  }
}

function startTimeFromRange(time: string): string {
  // Accept "8 am", "8:30 am", or "8:30 am – 10:00 am"
  const dash = time.indexOf('–');
  return dash >= 0 ? time.slice(0, dash).trim() : time.trim();
}

function flatten(itin: Itinerary, options: PdfExportOptions) {
  const days = itin.days || [];
  const flat: FlatItem[] = [];

  days.forEach((d, idx) => {
    const dateLabel = d?.date || '';
    (d?.items || []).forEach((it: any) => {
      const type = it?.type as FlatItem['type'] | undefined;
      if (!wantType(options, type)) return;

      const time = (it.time && it.time.trim()) || 'All-day';
      const start = time === 'All-day' ? '8 am' : startTimeFromRange(time);
      const mins = time === 'All-day' ? 8 * 60 : minsFromTime(start);

      flat.push({
        dateLabel,
        time,
        title: it.title || '',
        subtitle: (options.detailLevel !== 'minimal') ? it.subtitle : undefined,
        meta: (options.detailLevel === 'full' || options.detailLevel === 'summary') ? it.meta : undefined,
        thumb: options.showImages ? it.thumb : undefined,
        type,
        sortKey: idx * (24 * 60) + mins,
      });
    });
  });

  // Sort chronologically across the whole trip
  flat.sort((a, b) => a.sortKey - b.sortKey);
  return flat;
}

/* =========================================================================
   Image embedding (data URIs) to improve reliability in headless Chrome
   ========================================================================= */

async function toDataURI(url: string): Promise<string> {
  if (!url) return '';
  try {
    const res = await fetch(url);
    if (!res.ok) return '';
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = inferMime(url) || 'image/jpeg';
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch {
    return '';
  }
}

function inferMime(url: string): string | null {
  const u = url.toLowerCase();
  if (u.endsWith('.png')) return 'image/png';
  if (u.endsWith('.webp')) return 'image/webp';
  if (u.endsWith('.gif')) return 'image/gif';
  if (u.endsWith('.svg')) return 'image/svg+xml';
  if (u.endsWith('.jpg') || u.endsWith('.jpeg')) return 'image/jpeg';
  return null;
}

/* =========================================================================
   Handlebars template (hero image background + overlay, compact timeline)
   ========================================================================= */

const itineraryTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>{{hero.title}}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root{
      --sand-25:#fbf9f6; --sand-50:#f7f2ec; --sand-100:#efe7db;
      --ink:#222; --muted:#6b6b6b; --line:#e5dccf;
      --accent:#3a3a3a; --accent-rail:#b9b2a8;
      --hero-h: 220px;
      --radius: 12px;
      --shadow: 0 1px 2px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.08);
      --fs-base: {{fsBase}};
      --fs-small: {{fsSmall}};
      --fs-hero: {{fsHero}};
      --fs-day: {{fsDay}};
    }
    *{ box-sizing:border-box; }
    html,body{ margin:0; padding:0; background:#fff; color:var(--ink); font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Inter,system-ui,"Helvetica Neue",Arial; line-height:1.45; }
    .wrap{ padding:16px 20px 24px; }

    /* ---- HERO -------------------------------------------------------- */
    .hero{
      position: relative;
      height: var(--hero-h);
      border-radius: var(--radius);
      overflow: hidden;
      margin-bottom: 14px;
      background: {{#if hero.hasImage}}linear-gradient( to bottom, rgba(0,0,0,.35), rgba(0,0,0,.55) ), url('{{hero.banner}}') center/cover no-repeat{{else}}linear-gradient( to bottom, #e8e1d6, #d6ccbd){{/if}};
      box-shadow: var(--shadow);
      display: flex;
      align-items: flex-end;
    }
    .hero__content{
      padding: 16px 18px;
      color: #fff;
      text-shadow: 0 1px 0 rgba(0,0,0,.25);
      width: 100%;
      background: linear-gradient(to top, rgba(0,0,0,.45), rgba(0,0,0,0));
    }
    .hero__title{ font-size: var(--fs-hero); font-weight: 700; margin: 0 0 2px; letter-spacing:.2px; }
    .hero__meta{ font-size: calc(var(--fs-base) * .95); opacity:.95; }

    /* ---- INTRO STRIP ------------------------------------------------- */
    .intro{
      background: var(--sand-25);
      border:1px solid var(--sand-100);
      border-radius: var(--radius);
      padding:10px 14px;
      margin-bottom: 12px;
    }
    .pill{ display:inline-block; padding:2px 8px; border-radius:999px; background:#fff; border:1px solid var(--line); font-size: var(--fs-small); color: var(--muted); margin-right:6px; margin-bottom:6px; }

    /* ---- LAYOUT ------------------------------------------------------ */
    .flow{ margin-top: 10px; }
    .layout--timeline .flow{ position:relative; }
    .layout--timeline .rail{ position:absolute; left: 84px; top:0; bottom: 0; width:2px; background: linear-gradient(#d7cfc2,#e4dbcf); border-radius:2px; }
    .item{ display:flex; gap:14px; padding:10px 12px; border:1px solid var(--line); border-radius: 10px; background: var(--sand-25); margin: 8px 0; box-shadow: var(--shadow); break-inside: avoid; }
    .time{ width: 70px; flex: 0 0 70px; text-align:right; font-size: var(--fs-small); color: var(--muted); padding-top:2px; }
    .dot{ position:relative; width:10px; height:10px; border-radius:50%; background: var(--accent-rail); margin-left:2px; margin-top:4px; }
    .content{ flex: 1; min-width: 0; }
    .title{ font-weight: 650; margin: 0 0 2px; }
    .subtitle{ color: var(--muted); font-size: var(--fs-small); margin: 0 0 6px; }
    .meta{ display:flex; flex-wrap:wrap; gap:8px 12px; color: var(--muted); font-size: var(--fs-small); }
    .meta .badge{ display:inline-flex; align-items:center; gap:6px; }
    .thumb{ width:56px; height:56px; border-radius:8px; object-fit:cover; margin-left:auto; }

    /* List layout w/ columns for dense output */
    .layout--list.two-cols .flow{ column-count: 2; column-gap: 16px; }
    .layout--list.two-cols .item{ break-inside: avoid-column; }

    /* Density adjustments (auto when many items) */
    .dense .item{ padding:8px 10px; margin:6px 0; }
    .dense .thumb{ width:48px; height:48px; }
    .dense .subtitle{ margin-bottom:4px; }

    @media print{
      @page{ size: A4; margin: 10mm; }
      .wrap{ padding:0; }
    }
  </style>
</head>
<body class="layout--{{layout}} {{#if twoCols}}two-cols{{/if}} {{#if dense}}dense{{/if}}">
  <div class="wrap">
    <header class="hero">
      <div class="hero__content">
        <h1 class="hero__title">{{hero.title}}</h1>
        {{#if hero.dateRange}}<div class="hero__meta">{{hero.dateRange}}</div>{{/if}}
      </div>
    </header>

    <!-- Intro pills -->
    <section class="intro">
      {{#if pills.length}}
        {{#each pills}} <span class="pill">{{this}}</span> {{/each}}
      {{/if}}
    </section>

    <!-- Main content -->
    <section class="flow">
      {{#if (eq layout "timeline")}}<div class="rail"></div>{{/if}}

      {{#each items}}
        <article class="item">
          {{#if (eq ../layout "timeline")}}
            <div class="time">{{time}}</div>
            <div class="dot"></div>
          {{else}}
            <div class="time">{{time}}</div>
          {{/if}}

          <div class="content">
            <div class="title">{{title}}</div>
            {{#if subtitle}}<div class="subtitle">{{subtitle}}</div>{{/if}}

            {{#if meta.length}}
              <div class="meta">
                {{#each meta}}
                  <span class="badge">{{#if icon}}{{icon}} {{/if}}{{label}}</span>
                {{/each}}
              </div>
            {{/if}}
          </div>

          {{#if thumb}}<img src="{{thumb}}" class="thumb" alt=""/>{{/if}}
        </article>
      {{/each}}
    </section>
  </div>
</body>
</html>
`;

// Register helpers
Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
const template = Handlebars.compile(itineraryTemplate);

/* =========================================================================
   Public API
   ========================================================================= */

/**
 * Generate an elegant, single/two-page PDF for an itinerary.
 * Respects PdfExportOptions (detail level, layout, images, costs, sections).
 */
export async function generateItineraryPDF(
  data: ItineraryData,
  options: PdfExportOptions
): Promise<Buffer> {
  // 1) Normalize options / defaults
  const opts: PdfExportOptions = {
    showImages: true,
    showCosts: true,
    detailLevel: 'full',
    layout: 'timeline',           // 'timeline' | 'daily' | 'list' (daily → timeline styling)
    sections: {
      transportation: true,
      accommodation: true,
      activities: true,
      dining: true,
    },
    ...options,
  };

  // 2) Convert input data into canonical itinerary
  const itinerary: Itinerary = tripDataToItinerary(data);

  // 3) Flatten items across all days (sorted globally)
  const flat = flatten(itinerary, opts);

  // 4) Derive hero & intro pills
  const heroTitle = (itinerary as any)?.hero?.title || (itinerary as any)?.title || 'Trip Itinerary';
  const heroImg = (opts.showImages && (itinerary as any)?.hero?.bannerUrl) ? await toDataURI((itinerary as any).hero.bannerUrl) : '';
  const hasDates = !!(itinerary as any)?.hero?.dateRange;

  const pills: string[] = [];
  const destination = (itinerary as any)?.hero?.title?.split(' • ')?.[0] || undefined;
  if (destination) pills.push(destination);
  if (hasDates) pills.push((itinerary as any).hero.dateRange);

  const counts = {
    transport: flat.filter(f => f.type === 'transportation').length,
    stays:     flat.filter(f => f.type === 'accommodation').length,
    acts:      flat.filter(f => f.type === 'activity').length,
    dining:    flat.filter(f => f.type === 'dining').length,
  };
  const parts: string[] = [];
  if (counts.transport) parts.push(`${counts.transport} transport`);
  if (counts.stays)     parts.push(`${counts.stays} stays`);
  if (counts.acts)      parts.push(`${counts.acts} activities`);
  if (counts.dining)    parts.push(`${counts.dining} dining`);
  if (parts.length) pills.push(parts.join(' • '));

  // 5) Density & column heuristics to keep it to ~1–2 pages
  const itemCount = flat.length;
  const dense = itemCount > 18 || opts.detailLevel !== 'full';
  const twoCols = (opts.layout === 'list') && itemCount > 18;

  // 6) Font sizing tuned for A4 while fitting 1–2 pages
  const fsBase  = dense ? 10 : 11;

  // 7) Build template model
  const items = flat.map((f) => {
    const meta = (f.meta || []).slice();
    const typeIcon = ICON[f.type || ''] || '';
    if (typeIcon) {
      meta.unshift({ icon: typeIcon, label: (f.type || '').charAt(0).toUpperCase() + (f.type || '').slice(1) });
    }
    return { ...f, meta };
  });

  const model = {
    layout: opts.layout === 'daily' ? 'timeline' : opts.layout, // treat "daily" as timeline-style; no page breaks
    twoCols,
    dense,
    fsBase,
    fsSmall: Math.max(9, Math.round(fsBase * 0.9)),
    fsHero:  dense ? 22 : 24,
    fsDay:   dense ? 14 : 15,
    hero: {
      title: heroTitle,
      dateRange: (itinerary as any)?.hero?.dateRange || '',
      banner: heroImg,
      hasImage: !!heroImg,
    },
    pills,
    items,
  };

  const html = template(model);

  // 8) Render with Puppeteer
  const launch = getLaunchOptions();
  let browser;
  try {
    browser = await puppeteer.launch(launch);
  } catch (e: any) {
    console.error('Puppeteer launch failed', { executablePath: launch.executablePath, message: e?.message });
    throw new Error(`Puppeteer launch failed (path=${launch.executablePath || 'auto'}): ${e?.message || 'unknown'}`);
  }

  try {
    const page = await browser.newPage();
    await page.emulateMediaType('print');
    // Viewport tuned for A4 @ ~96DPI; margins set in page.pdf
    await page.setViewport({ width: 794, height: 1123 });
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
      preferCSSPageSize: true,
    });

    await page.close();
    return buffer as Buffer;
  } finally {
    await browser.close().catch(() => {});
  }
}

/**
 * Get a safe PDF filename (linear-time sanitizer).
 */
export function getPDFFilename(destination: string, opts?: { simple?: boolean }): string {
  const prefix = opts?.simple ? 'summary' : 'elegant';
  const safe   = sanitizeFilename(destination);
  const t = new Date();
  const stamp = `${t.getFullYear()}${`${t.getMonth()+1}`.padStart(2,'0')}${`${t.getDate()}`.padStart(2,'0')}${`${t.getHours()}`.padStart(2,'0')}${`${t.getMinutes()}`.padStart(2,'0')}`;
  return `${prefix}-${safe}-itinerary-${stamp}.pdf`;
}
