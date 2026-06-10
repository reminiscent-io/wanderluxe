/* src/services/pdfmake-export.ts
   Orchestrates the itinerary PDF export:
   fonts → fetch data (pdf/data) → build document (pdf/builder) → download.
   All layout decisions live in pdf/theme.ts and pdf/builder.ts. */

import pdfMake from 'pdfmake/build/pdfmake';
import { loadPdfFonts } from './pdf-fonts';
import { fetchPdfTripData } from './pdf/data';
import { buildDocDefinition } from './pdf/builder';
import { sanitizeFilename } from './pdf/format';
import { PAGE, innerPageWidth, defaultPageSize } from './pdf/theme';
import type { PdfExportOptions, ResolvedPdfOptions } from './pdf/types';

export async function exportItineraryPdf(tripId: string, o: PdfExportOptions): Promise<void> {
  await loadPdfFonts();

  const opts: ResolvedPdfOptions = {
    showImages: o.showImages,
    showCosts: o.showCosts,
    pageSize: o.pageSize ?? defaultPageSize(),
    exportedAt: new Date(),
  };

  const contentWidth = innerPageWidth(opts.pageSize, PAGE.margins);
  const data = await fetchPdfTripData(tripId, o, contentWidth);
  const doc = buildDocDefinition(data, opts);

  const fileName = `${sanitizeFilename(data.destination)}-itinerary.pdf`;
  const pdf = pdfMake.createPdf(doc);

  return new Promise<void>((resolve, reject) => {
    pdf.getBlob((blob: Blob) => {
      try {
        if (!blob) {
          reject(new Error('Failed to generate PDF blob'));
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => {
          URL.revokeObjectURL(url);
          resolve();
        }, 100);
      } catch (err) {
        reject(err);
      }
    });
  });
}
