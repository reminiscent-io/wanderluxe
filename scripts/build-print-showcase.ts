// Builds the committed assets behind the landing page's Print Studio section.
// Run by hand, never in CI or the build:
//
//   npm run build:print-showcase
//
// Needs OPENAI_API_KEY in .env (three model calls, a few cents), and the PDF
// page step uses macOS `sips`. Outputs are committed, so nobody else ever runs
// this and the landing page never calls an API at runtime.

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import PdfPrinter from 'pdfmake';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { buildPdfTripData } from '../src/services/pdf/data';
import { buildDocDefinition } from '../src/services/pdf/builder';
import { defaultPageSize } from '../src/services/pdf/theme';
import { sanitizePrintDesign } from '../src/lib/printDesign/spec';
import { generatePrintDesign, type PrintTripRows } from '../server/lib/printDesign';
import { TOKYO_ROWS, TOKYO_THEMES } from '../src/components/landing/print-showcase/tokyoRows';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'src/components/landing/print-showcase');
const fontsDir = path.join(root, 'src/assets/fonts/pdf');
const OPTS = { showImages: false, showCosts: true } as const;
const CONTENT_WIDTH = 800;

/** The generation module names its rows differently from the PDF module. */
function toPrintTripRows(rows: typeof TOKYO_ROWS): PrintTripRows {
  return {
    trip: rows.trip as unknown as Record<string, unknown>,
    days: rows.days as unknown as Record<string, unknown>[],
    activities: rows.acts as unknown as Record<string, unknown>[],
    stays: rows.stays as unknown as Record<string, unknown>[],
    transportation: rows.trans as unknown as Record<string, unknown>[],
    reservations: rows.dine as unknown as Record<string, unknown>[],
    otherExpenses: [],
  };
}

async function writeTripData() {
  const data = await buildPdfTripData(TOKYO_ROWS, OPTS, CONTENT_WIDTH);
  // The showcase cover is a local file, not a fetched data URI.
  data.coverImageDataUri = '';
  data.coverImageRequested = false;
  fs.writeFileSync(path.join(outDir, 'tokyoTrip.json'), `${JSON.stringify(data, null, 2)}\n`);
  console.log(
    `tokyoTrip.json: ${data.days.length} days, ${data.days.reduce((n, d) => n + d.items.length, 0)} items`
  );
  return data;
}

function renderSimplePdfImage(doc: TDocumentDefinitions) {
  const printer = new PdfPrinter({
    DMSerifDisplay: {
      normal: path.join(fontsDir, 'DMSerifDisplay-Regular.ttf'),
      bold: path.join(fontsDir, 'DMSerifDisplay-Regular.ttf'),
      italics: path.join(fontsDir, 'DMSerifDisplay-Italic.ttf'),
      bolditalics: path.join(fontsDir, 'DMSerifDisplay-Italic.ttf'),
    },
    DMSans: {
      normal: path.join(fontsDir, 'DMSans-Regular.ttf'),
      bold: path.join(fontsDir, 'DMSans-Medium.ttf'),
      italics: path.join(fontsDir, 'DMSans-Italic.ttf'),
      bolditalics: path.join(fontsDir, 'DMSans-MediumItalic.ttf'),
    },
  });

  const tmpPdf = path.join(root, 'node_modules/.cache/print-showcase.pdf');
  fs.mkdirSync(path.dirname(tmpPdf), { recursive: true });

  return new Promise<void>((resolve, reject) => {
    const stream = fs.createWriteStream(tmpPdf);
    const pdf = printer.createPdfKitDocument(doc);
    pdf.pipe(stream);
    pdf.on('error', reject);
    stream.on('finish', () => {
      const out = path.join(root, 'public/images/print-showcase-simple-pdf.png');
      // sips converts page one only, which is what the landing page shows.
      execFileSync('sips', ['-s', 'format', 'png', tmpPdf, '--out', out]);
      console.log(`wrote ${path.relative(root, out)}`);
      resolve();
    });
    pdf.end();
  });
}

async function writeEditions() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is required to generate the showcase editions');

  const rows = toPrintTripRows(TOKYO_ROWS);
  const dayDates = TOKYO_ROWS.days.map((d) => d.date as string);
  const editions = [];
  for (const theme of TOKYO_THEMES) {
    const { design } = await generatePrintDesign(apiKey, rows, theme);
    editions.push(sanitizePrintDesign(design, dayDates));
    console.log(`generated: ${theme}`);
  }
  fs.writeFileSync(path.join(outDir, 'tokyoEditions.json'), `${JSON.stringify(editions, null, 2)}\n`);
}

async function main() {
  const data = await writeTripData();
  await renderSimplePdfImage(buildDocDefinition(data, {
    showImages: false,
    showCosts: true,
    pageSize: defaultPageSize(),
    exportedAt: new Date('2026-09-01T09:00:00'),
  }));
  await writeEditions();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
