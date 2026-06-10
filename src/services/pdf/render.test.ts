// src/services/pdf/render.test.ts
// Smoke test: the doc definition actually renders to a real PDF via the
// pdfmake Node printer, using the same TTFs the browser embeds.
// (@types/pdfmake types the root 'pdfmake' import as the Node printer.)
// Run with PDF_PREVIEW=1 to write /tmp/wanderluxe-pdf-preview.pdf for eyeballing.
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import PdfPrinter from 'pdfmake';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { buildDocDefinition } from './builder';
import { romeTrip, FIXTURE_OPTS } from './fixtures';

const fontsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../assets/fonts/pdf');

function renderToBuffer(doc: TDocumentDefinitions): Promise<Buffer> {
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

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const pdfDoc = printer.createPdfKitDocument(doc);
    pdfDoc.on('data', (c: Buffer) => chunks.push(c));
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
    pdfDoc.on('error', reject);
    pdfDoc.end();
  });
}

describe('render smoke test', () => {
  it('renders the fixture to a valid multi-KB PDF', async () => {
    const buf = await renderToBuffer(buildDocDefinition(romeTrip(), FIXTURE_OPTS));
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buf.length).toBeGreaterThan(5000);
    if (process.env.PDF_PREVIEW) {
      fs.writeFileSync('/tmp/wanderluxe-pdf-preview.pdf', buf);
    }
  }, 20000);

  it('renders without images and costs', async () => {
    const data = { ...romeTrip(), coverImageDataUri: '', coverImageRequested: false };
    const buf = await renderToBuffer(
      buildDocDefinition(data, { ...FIXTURE_OPTS, showImages: false, showCosts: false })
    );
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
  }, 20000);
});
