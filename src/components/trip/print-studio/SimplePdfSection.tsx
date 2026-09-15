// The free half of the Print dialog: the plain typeset PDF.
//
// It is the same pdfmake export it always was — a real file, downloadable and
// readable on a plane — and it sits above the Studio section so the two read
// as one thing with a simple version and a designed version.

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { exportItineraryPdf } from '@/services/pdfmake-export';
import { defaultPageSize, type PdfPageSize } from '@/services/pdf/theme';
import type { PdfExportOptions } from '@/services/pdf/types';

const SimplePdfSection: React.FC<{ tripId: string }> = ({ tripId }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [options, setOptions] = useState<PdfExportOptions>({
    showImages: true,
    showCosts: true,
    pageSize: defaultPageSize(),
  });

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      await exportItineraryPdf(tripId, options);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('[SimplePdfSection] Export failed:', error);
      toast.error(
        `Failed to export PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section aria-labelledby="print-simple-heading">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="print-simple-heading" className="text-sm font-semibold text-foreground">
          Simple PDF
        </h3>
        <span className="shrink-0 text-xs uppercase tracking-wider text-muted-foreground">Free</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        The whole itinerary, typeset and ready to print. Keep it on your phone for the flight.
      </p>

      {/* One row rather than three labelled rows: this is the quick path, and
          the Studio section below has to stay reachable on a short viewport. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex items-center gap-2">
          <Switch
            id="print-photos"
            checked={options.showImages}
            onCheckedChange={(checked) => setOptions((p) => ({ ...p, showImages: checked }))}
          />
          <Label htmlFor="print-photos" className="text-sm text-earth-600">
            Photos
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="print-prices"
            checked={options.showCosts}
            onCheckedChange={(checked) => setOptions((p) => ({ ...p, showCosts: checked }))}
          />
          <Label htmlFor="print-prices" className="text-sm text-earth-600">
            Prices
          </Label>
        </div>
        <div className="flex items-center gap-1" role="group" aria-label="Paper size">
          {(['LETTER', 'A4'] as PdfPageSize[]).map((size) => (
            <Button
              key={size}
              type="button"
              size="sm"
              variant={options.pageSize === size ? 'default' : 'outline'}
              aria-pressed={options.pageSize === size}
              onClick={() => setOptions((p) => ({ ...p, pageSize: size }))}
            >
              {size === 'LETTER' ? 'Letter' : 'A4'}
            </Button>
          ))}
        </div>
      </div>

      <Button
        type="button"
        onClick={handleDownload}
        disabled={isExporting}
        className="mt-4 h-11 w-full sm:h-10 sm:w-auto"
      >
        {isExporting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <FileDown className="mr-2 h-4 w-4" aria-hidden />
        )}
        {isExporting ? 'Preparing…' : 'Download PDF'}
      </Button>
    </section>
  );
};

export default SimplePdfSection;
