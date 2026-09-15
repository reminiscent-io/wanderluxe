// The free user's view of the Studio: their own itinerary, in a designed page.
//
// Showing beats describing, and showing *their* trip beats showing a stranger's
// — but only if it is honest. So this is the real PrintDocument with the real
// trip data and a fixed sample design that carries no model prose: a palette,
// a typeface pairing, a motif, and the traveler's own plans.

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPdfTripData } from '@/services/pdf/data';
import { getFontPairing } from '@/lib/printDesign/spec';
import { teaserDesign } from '@/lib/printDesign/sample';
import PrintDocument from './PrintDocument';
import PageThumbnail from './PageThumbnail';
import ProFeatureList from './ProFeatureList';
import { useGoogleFonts } from './useGoogleFonts';
import { PRINT_OPTS, CONTENT_WIDTH, printTripDataKey } from './printTripData';
import { Skeleton } from '@/components/ui/skeleton';

interface StudioTeaserProps {
  tripId: string;
  destination?: string;
  /** False keeps the query idle — the dialog is closed, or the user is Pro. */
  enabled?: boolean;
}

const StudioTeaser: React.FC<StudioTeaserProps> = ({ tripId, destination, enabled = true }) => {
  const design = teaserDesign(destination);
  useGoogleFonts(enabled ? getFontPairing(design.fontPairing).googleQuery : null);

  const { data, isError } = useQuery({
    // The edition page's key: an edition opened after upgrading finds this
    // fetch already done.
    queryKey: printTripDataKey(tripId, null),
    enabled,
    queryFn: () => fetchPdfTripData(tripId, PRINT_OPTS, CONTENT_WIDTH),
    staleTime: 60_000,
  });

  // Only when there is nothing to show. A background refetch that fails (the
  // window regains focus after staleTime, offline) must not swap a working
  // preview for sell copy.
  if (isError && !data) return <ProFeatureList />;

  return (
    <div className="flex items-start gap-4">
      <div className="w-[10rem] shrink-0">
        {data ? (
          <PageThumbnail label="Preview of this trip in a sample Print Studio style" aspect={1.3}>
            <PrintDocument design={design} data={data} />
          </PageThumbnail>
        ) : (
          <Skeleton className="w-full rounded-card" style={{ aspectRatio: '1 / 1.3' }} />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-earth-600">
          Your trip, in a sample style. Pro designs one around it: a palette, typefaces and a line
          for every day, and every line is yours to rewrite.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          <span className="font-semibold tabular-nums text-foreground">$3.99</span> / month
        </p>
      </div>
    </div>
  );
};

export default StudioTeaser;
