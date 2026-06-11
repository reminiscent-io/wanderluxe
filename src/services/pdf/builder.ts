// src/services/pdf/builder.ts — pure document builder. Data in, docDefinition out.
// Imports only theme/format/pagination/types + date-fns + pdfmake types.
// No Supabase, no DOM, no network — builder.test.ts and render.test.ts depend on this purity.
import { format as fnsFormat } from 'date-fns';
import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import { PAGE, TYPE, SPACE, COLORS, FONTS, innerPageWidth } from './theme';
import { fmtMoney, fmtShort } from './format';
import { isOrphanedHeading } from './pagination';
import type { PdfTripData, ResolvedPdfOptions, Item, Day, AccommodationSummary, TransportSegment, DiningRef, BudgetData } from './types';

/* =========================================================================
   Table render
   ========================================================================= */

function renderTable(items: Item[], o: ResolvedPdfOptions, timeWidth: number) {
  if (!items.length) {
    return { text: 'No activities scheduled', style: 'itemMeta', margin: [0, 0, 0, SPACE.md] };
  }

  const body = items.map((it, idx) => {
    const zebra = idx % 2 === 0 ? COLORS.white : COLORS.sand;

    const titleLine =
      (o.showCosts && it.cost)
        ? {
            columns: [
              { text: it.title, style: 'itemTitle', width: '*' },
              { text: it.cost, style: 'itemCost', alignment: 'right', width: 'auto' },
            ],
            columnGap: SPACE.md,
          }
        : { text: it.title, style: 'itemTitle' };

    const combinedDetails: string[] = [];
    if (it.details) combinedDetails.push(it.details);
    if (it.location) combinedDetails.push(it.location);

    const stack: Content[] = [titleLine];

    if (combinedDetails.length) {
      stack.push({ text: combinedDetails.join(' • '), style: 'itemDetail', margin: [0, SPACE.xs, 0, 0] });
    }

    if (it.thumb && o.showImages) {
      stack.push({ image: it.thumb, width: PAGE.thumbSize, height: PAGE.thumbSize, margin: [0, SPACE.sm, 0, 0] });
    }

    return [
      { text: it.time, style: 'timeCell', alignment: 'right', margin: [0, SPACE.sm, SPACE.sm + 2, SPACE.sm], fillColor: zebra },
      { stack, fillColor: zebra, margin: [SPACE.sm + 2, SPACE.sm, SPACE.sm + 2, SPACE.sm] },
    ];
  });

  return {
    table: { widths: [timeWidth, '*'], body, dontBreakRows: true },
    layout: {
      hLineWidth: (i: number) => (i === 0 || i === body.length ? 0 : 0.5),
      vLineWidth: () => 0,
      hLineColor: () => COLORS.rule,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 3,
      paddingBottom: () => 3,
    },
  };
}

/* =========================================================================
   New Helper Functions for Compact Layout
   ========================================================================= */

/**
 * Render compact day header with inline travel marker + divider line
 */
function renderCompactDayHeader(d: Day, isFirstOnPage: boolean, contentWidth: number): Content {
  const dayText = d.title?.trim()
    ? `${fmtShort(d.date)} • ${d.title}`
    : fmtShort(d.date);

  const stack: Content[] = [
    {
      text: [
        { text: dayText },
        ...(d.hasTransport
          ? [{
              text: '   TRAVEL DAY',
              fontSize: TYPE.caption,
              font: FONTS.sans,
              color: COLORS.sunset,
              characterSpacing: 1,
            }]
          : []),
      ],
      style: 'sectionHeading',
      margin: [0, isFirstOnPage ? 0 : SPACE.lg, 0, SPACE.xs] as [number, number, number, number],
    },
    {
      canvas: [
        { type: 'line', x1: 0, y1: 0, x2: Math.max(100, Math.round(contentWidth)), y2: 0, lineWidth: 0.5, lineColor: COLORS.earthLight },
      ],
      margin: [0, 0, 0, SPACE.sm] as [number, number, number, number],
    },
  ];

  if (d.description?.trim()) {
    stack.push({
      text: d.description.trim(),
      style: 'dayDescription',
      margin: [0, 0, 0, SPACE.sm] as [number, number, number, number],
    });
  }

  return { stack, headlineLevel: 1, unbreakable: true };
}

function buildActivityLevelEntries(busyDays: number, moderateDays: number, lightDays: number): Content[] {
  const entries: Content[] = [];
  const levels: Array<{ count: number; label: string; color: string }> = [
    { count: busyDays, label: 'Busy (4+ activities)', color: COLORS.earth },
    { count: moderateDays, label: 'Moderate (2-3 activities)', color: COLORS.earthLight },
    { count: lightDays, label: 'Light (0-1 activities)', color: COLORS.earthMid },
  ];
  for (const { count, label, color } of levels) {
    if (count > 0) {
      entries.push({
        text: `• ${label}: ${count} day${count === 1 ? '' : 's'}`,
        style: 'tableCell',
        color,
        margin: [0, 0, 0, SPACE.xs] as [number, number, number, number],
      });
    }
  }
  return entries;
}

function computeDayStats(days: Day[]): { totalActivities: number; busyDays: number; moderateDays: number; lightDays: number } {
  let totalActivities = 0;
  let busyDays = 0;
  let moderateDays = 0;
  let lightDays = 0;
  for (const d of days) {
    const count = d.activityCount || 0;
    totalActivities += count;
    if (count >= 4) busyDays++;
    else if (count >= 2) moderateDays++;
    else lightDays++;
  }
  return { totalActivities, busyDays, moderateDays, lightDays };
}

interface CoverPageArgs {
  destination: string;
  dateRange: string;
  stays: AccommodationSummary[];
  transports: TransportSegment[];
  days: Day[];
  coverDataUrl: string;
  coverRequested: boolean;
  contentWidth: number;
}

/**
 * Render combined cover page with 2-column layout
 */
function renderCombinedCoverPage({
  destination,
  dateRange,
  stays,
  transports,
  days,
  coverDataUrl,
  coverRequested,
  contentWidth,
}: CoverPageArgs): Content[] {
  const content: Content[] = [];
  const bandWidth = Math.max(200, Math.round(contentWidth));

  content.push({
    canvas: [{ type: 'rect', x: 0, y: 0, w: bandWidth, h: 6, color: COLORS.earthLight }],
    margin: [0, 0, 0, SPACE.lg] as [number, number, number, number],
  });

  if (coverDataUrl) {
    content.push({
      image: coverDataUrl,
      width: bandWidth,
      height: PAGE.coverImageHeight,
      margin: [0, 0, 0, SPACE.xl] as [number, number, number, number],
    });
  } else if (coverRequested) {
    // Image fetch failed (CORS/network): keep the layout identical with a sand band
    // instead of silently collapsing the cover.
    content.push({
      canvas: [{ type: 'rect', x: 0, y: 0, w: bandWidth, h: PAGE.coverImageHeight, color: COLORS.sand }],
      margin: [0, 0, 0, SPACE.xl] as [number, number, number, number],
    });
  }

  content.push({ text: `${destination} Itinerary`, style: 'coverTitle', margin: [0, 0, 0, SPACE.sm] as [number, number, number, number] });

  if (dateRange) {
    content.push({ text: dateRange, style: 'coverSubtitle', margin: [0, 0, 0, SPACE.md] as [number, number, number, number] });
  }

  content.push({
    canvas: [{ type: 'line', x1: 0, y1: 0, x2: bandWidth, y2: 0, lineWidth: 0.75, lineColor: COLORS.earthLight }],
    margin: [0, 0, 0, SPACE.lg] as [number, number, number, number],
  });

  const totalFlights = transports.filter((t) => t.type.toLowerCase().includes('flight')).length;
  const { totalActivities, busyDays, moderateDays, lightDays } = computeDayStats(days);

  const leftColumn: Content[] = [
    { text: 'Trip Details', style: 'sectionHeading', margin: [0, 0, 0, SPACE.sm] as [number, number, number, number] },
    { text: `Duration: ${days.length} days`, style: 'body', margin: [0, 0, 0, SPACE.xs] as [number, number, number, number] },
  ];

  if (stays.length > 0) {
    leftColumn.push(
      { text: 'Accommodations', style: 'sectionHeading', margin: [0, SPACE.md, 0, SPACE.sm] as [number, number, number, number] },
      {
        table: {
          widths: ['*', 'auto', 'auto'],
          dontBreakRows: true,
          body: [
            [
              { text: 'Hotel', style: 'tableCellStrong' },
              { text: 'Check In', style: 'tableCellStrong' },
              { text: 'Check Out', style: 'tableCellStrong' },
            ],
            ...stays.map((s) => [
              { text: s.hotel, style: 'tableCell' },
              { text: s.checkIn, style: 'tableCell' },
              { text: s.checkOut, style: 'tableCell' },
            ]),
          ],
        },
        layout: 'lightHorizontalLines',
      }
    );
  }

  const rightColumn: Content[] = [
    { text: 'Quick Stats', style: 'sectionHeading', margin: [0, 0, 0, SPACE.sm] as [number, number, number, number] },
    { text: `${totalFlights} flight${totalFlights === 1 ? '' : 's'}`, style: 'body', margin: [0, 0, 0, SPACE.xs] as [number, number, number, number] },
    { text: `${totalActivities} activit${totalActivities === 1 ? 'y' : 'ies'}`, style: 'body', margin: [0, 0, 0, SPACE.sm] as [number, number, number, number] },
    { text: 'Activity Level', style: 'sectionHeading', margin: [0, SPACE.sm, 0, SPACE.sm] as [number, number, number, number] },
    ...buildActivityLevelEntries(busyDays, moderateDays, lightDays),
  ];

  content.push(
    {
      columns: [{ stack: leftColumn, width: '*' }, { stack: rightColumn, width: '*' }],
      columnGap: SPACE.xl + SPACE.sm,
    },
    { text: '', pageBreak: 'after' }
  );
  return content;
}

/**
 * Render reference section with full accommodation, transportation, and dining details
 */
function renderReferenceSection(
  stays: AccommodationSummary[],
  transports: TransportSegment[],
  diningRefs: DiningRef[]
): Content[] {
  const content: Content[] = [];

  content.push(
    { text: '', pageBreak: 'before' },
    { text: 'Reference Information', style: 'pageHeading', headlineLevel: 1, margin: [0, 0, 0, SPACE.lg] as [number, number, number, number] }
  );

  if (stays.length > 0) {
    content.push({ text: 'Accommodation Details', style: 'sectionHeading', headlineLevel: 1, margin: [0, SPACE.md, 0, SPACE.md] as [number, number, number, number] });

    stays.forEach((stay, idx) => {
      const details: Content[] = [
        { text: stay.hotel, style: 'itemTitle', margin: [0, 0, 0, SPACE.xs] as [number, number, number, number] },
        { text: `Check-in: ${stay.checkIn}`, style: 'body', margin: [0, 0, 0, SPACE.xs] as [number, number, number, number] },
        { text: `Check-out: ${stay.checkOut}`, style: 'body', margin: [0, 0, 0, SPACE.xs] as [number, number, number, number] },
      ];
      if (stay.address) details.push({ text: stay.address, style: 'metaText', margin: [0, 0, 0, SPACE.xs] as [number, number, number, number] });
      if (stay.phone) details.push({ text: `Phone: ${stay.phone}`, style: 'metaText', margin: [0, 0, 0, SPACE.xs] as [number, number, number, number] });
      if (stay.website) details.push({ text: `Website: ${stay.website}`, style: 'metaText', margin: [0, 0, 0, SPACE.xs] as [number, number, number, number] });

      content.push({
        stack: details,
        unbreakable: true,
        margin: [0, 0, 0, idx < stays.length - 1 ? SPACE.lg : 0] as [number, number, number, number],
      });
    });
  }

  const transWithConf = transports.filter((t): t is TransportSegment & { confirmationNumber: string } => Boolean(t.confirmationNumber));
  if (transWithConf.length > 0) {
    content.push(
      { text: 'Transportation Confirmations', style: 'sectionHeading', headlineLevel: 1, margin: [0, SPACE.xl, 0, SPACE.md] as [number, number, number, number] },
      {
        table: {
          widths: ['auto', '*', 'auto'],
          dontBreakRows: true,
          body: [
            [
              { text: 'Transport', style: 'tableHeader' },
              { text: 'Route', style: 'tableHeader' },
              { text: 'Confirmation #', style: 'tableHeader' },
            ],
            ...transWithConf.map((t) => [
              { text: `${t.type} (${t.date})`, style: 'tableCell' },
              { text: `${t.from} to ${t.to}`, style: 'tableCell' },
              { text: t.confirmationNumber, style: 'tableCell', bold: true },
            ]),
          ],
        },
        layout: 'lightHorizontalLines',
      }
    );
  }

  if (diningRefs.length > 0) {
    const diningWithConf = diningRefs.filter((r): r is DiningRef & { confirmationNumber: string } => Boolean(r.confirmationNumber));
    if (diningWithConf.length > 0) {
      content.push(
        { text: 'Dining Confirmations', style: 'sectionHeading', headlineLevel: 1, margin: [0, SPACE.xl, 0, SPACE.md] as [number, number, number, number] },
        {
          table: {
            widths: ['*', 'auto'],
            dontBreakRows: true,
            body: [
              [
                { text: 'Restaurant', style: 'tableHeader' },
                { text: 'Confirmation #', style: 'tableHeader' },
              ],
              ...diningWithConf.map((r) => [
                { text: r.restaurant, style: 'tableCell' },
                { text: r.confirmationNumber, style: 'tableCell', bold: true },
              ]),
            ],
          },
          layout: 'lightHorizontalLines',
        }
      );
    }
  }

  const staysWithContact = stays.filter((s) => s.phone || s.website);
  if (staysWithContact.length > 0) {
    content.push({ text: 'Hotel Contact Information', style: 'sectionHeading', headlineLevel: 1, margin: [0, SPACE.xl, 0, SPACE.md] as [number, number, number, number] });
    staysWithContact.forEach((stay, idx) => {
      const lines: Content[] = [{ text: stay.hotel, style: 'itemTitle', margin: [0, 0, 0, SPACE.xs] as [number, number, number, number] }];
      if (stay.phone) lines.push({ text: `Phone: ${stay.phone}`, style: 'body', margin: [0, 0, 0, SPACE.xs] as [number, number, number, number] });
      if (stay.website) lines.push({ text: `Website: ${stay.website}`, style: 'metaText', margin: [0, 0, 0, SPACE.xs] as [number, number, number, number] });
      content.push({
        stack: lines,
        unbreakable: true,
        margin: [0, 0, 0, idx < staysWithContact.length - 1 ? SPACE.md : 0] as [number, number, number, number],
      });
    });
  }

  return content;
}

/**
 * Render budget summary section (2c)
 */
function renderBudgetSummary(budgetData: BudgetData): Content[] {
  if (budgetData.categories.length === 0) return [];

  const content: Content[] = [];

  content.push({ text: 'Budget Summary', style: 'sectionHeading', headlineLevel: 1, margin: [0, SPACE.xl, 0, SPACE.md] as [number, number, number, number] });

  // Budget categories sum raw amounts across currencies and have always been
  // labeled USD. Honest multi-currency totals need exchange-rate conversion —
  // out of scope here (see plan: Out of scope).
  const tableBody: TableCell[][] = [
    [
      { text: 'Category', style: 'tableHeader' },
      { text: 'Amount', style: 'tableHeader', alignment: 'right' },
    ],
    ...budgetData.categories.map((c) => [
      { text: c.category, style: 'tableCell' },
      { text: fmtMoney(c.amount, 'USD'), style: 'tableCell', alignment: 'right' },
    ]),
    [
      { text: 'Total', style: 'tableCellStrong', fillColor: COLORS.totalFill },
      { text: fmtMoney(budgetData.total, 'USD'), style: 'tableCellStrong', alignment: 'right', fillColor: COLORS.totalFill },
    ],
  ];

  content.push({
    table: { widths: ['*', 'auto'], body: tableBody, dontBreakRows: true },
    layout: 'lightHorizontalLines',
  });

  if (budgetData.budget != null && budgetData.budget > 0) {
    const remaining = budgetData.budget - budgetData.total;
    const overBudget = remaining < 0;
    content.push({
      columns: [
        { text: `Budget: ${fmtMoney(budgetData.budget, 'USD')}`, style: 'body', width: 'auto' },
        { text: '  |  ', style: 'metaText', width: 'auto' },
        {
          text: overBudget
            ? `Over budget by ${fmtMoney(Math.abs(remaining), 'USD')}`
            : `Remaining: ${fmtMoney(remaining, 'USD')}`,
          style: 'body',
          color: overBudget ? COLORS.sunset : COLORS.earth,
          bold: true,
          width: 'auto',
        },
      ],
      margin: [0, SPACE.sm + 2, 0, 0] as [number, number, number, number],
    });
  }

  return content;
}

/* =========================================================================
   Public API
   ========================================================================= */

export function buildDocDefinition(data: PdfTripData, opts: ResolvedPdfOptions): TDocumentDefinitions {
  const contentWidth = innerPageWidth(opts.pageSize, PAGE.margins);
  const content: Content[] = [];

  content.push(
    ...renderCombinedCoverPage({
      destination: data.destination,
      dateRange: data.dateRange,
      stays: data.stays,
      transports: data.transports,
      days: data.days,
      coverDataUrl: data.coverImageDataUri,
      coverRequested: data.coverImageRequested,
      contentWidth,
    })
  );

  // Daily itineraries — pdfmake paginates by real height; the pageBreakBefore
  // rule (isOrphanedHeading) keeps day headers attached to their tables.
  data.days.forEach((d, idx) => {
    content.push(renderCompactDayHeader(d, idx === 0, contentWidth), renderTable(d.items, opts, PAGE.timeColWidth));
  });

  if (opts.showCosts) {
    content.push(...renderBudgetSummary(data.budgetData));
  }

  content.push(...renderReferenceSection(data.stays, data.transports, data.diningRefs));

  return {
    pageSize: opts.pageSize,
    pageMargins: PAGE.margins,
    defaultStyle: { fontSize: TYPE.body, lineHeight: 1.3, font: FONTS.sans, color: COLORS.accent }, // 1.3 leading: 10pt body needs looser lines than the old 8-9pt/1.25
    header: () => ({
      text: data.dateRange ? `${data.destination} • ${data.dateRange}` : data.destination,
      alignment: 'center' as const,
      style: 'pageChrome',
      margin: [0, PAGE.headerOffsetY, 0, 0] as [number, number, number, number],
    }),
    footer: (p: number, c: number) => ({
      text: `Page ${p} of ${c} • exported ${fnsFormat(opts.exportedAt, 'PP p')}`,
      alignment: 'center' as const,
      style: 'pageChrome',
      margin: [0, PAGE.footerOffsetY, 0, 0] as [number, number, number, number],
    }),
    content,
    styles: {
      coverTitle: { fontSize: TYPE.display, font: FONTS.serif, color: COLORS.earth },
      coverSubtitle: { fontSize: TYPE.section, color: COLORS.earthLight },
      pageHeading: { fontSize: TYPE.title, font: FONTS.serif, color: COLORS.earth },
      sectionHeading: { fontSize: TYPE.section, font: FONTS.serif, color: COLORS.earth },
      dayDescription: { fontSize: TYPE.detail, italics: true, color: COLORS.earthLight },
      body: { fontSize: TYPE.body },
      timeCell: { fontSize: TYPE.detail, bold: true, color: COLORS.earthLight },
      itemTitle: { fontSize: TYPE.body, bold: true, color: COLORS.earth },
      itemDetail: { fontSize: TYPE.detail, color: COLORS.earthLight },
      itemMeta: { fontSize: TYPE.detail, italics: true, color: COLORS.earthMid },
      itemCost: { fontSize: TYPE.caption, color: COLORS.earthMid },
      tableHeader: { fontSize: TYPE.caption, bold: true, color: COLORS.white, fillColor: COLORS.earthLight },
      tableCell: { fontSize: TYPE.caption },
      tableCellStrong: { fontSize: TYPE.body, bold: true }, // emphasized cell: lightweight table headers (cover) + budget total — distinct from filled `tableHeader`
      metaText: { fontSize: TYPE.caption, color: COLORS.earthMid },
      pageChrome: { fontSize: TYPE.caption, color: COLORS.earthLight },
    },
    pageBreakBefore: (currentNode, followingNodesOnPage) =>
      isOrphanedHeading(currentNode, followingNodesOnPage),
  };
}
