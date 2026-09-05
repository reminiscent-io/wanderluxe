// /trip/:tripId/print/:designId — the Print Studio output page.
//
// Loads the stored AI design spec (RLS: trip access) and the same trip data
// module the PDF export uses, injects the design's Google Fonts pairing, and
// renders the keepsake document with a screen-only toolbar. Printing is the
// browser's native dialog (Save as PDF included), so output quality rides on
// real print CSS rather than a canvas rasterizer.

import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { fetchPdfTripData } from '@/services/pdf/data';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getFontPairing, type PrintDesignSpec } from '@/lib/printDesign/spec';
import PrintDocument from '@/components/trip/print-studio/PrintDocument';
import { track } from '@/lib/analytics';

const isValidUUID = (s: string | undefined): s is string =>
  !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

interface DesignRow {
  id: string;
  trip_id: string;
  theme_prompt: string | null;
  design: PrintDesignSpec;
  created_at: string;
}

/**
 * Loads the design's Google Fonts pairing. The preconnect matters here: the
 * whole page is a type specimen, so a late stylesheet shows the document in
 * fallback faces first.
 */
function useGoogleFonts(googleQuery: string | null) {
  useEffect(() => {
    if (!googleQuery) return;
    const nodes: HTMLLinkElement[] = [];
    const add = (rel: string, href: string, crossOrigin?: string) => {
      const link = document.createElement('link');
      link.rel = rel;
      link.href = href;
      if (crossOrigin !== undefined) link.crossOrigin = crossOrigin;
      document.head.appendChild(link);
      nodes.push(link);
    };
    add('preconnect', 'https://fonts.googleapis.com');
    add('preconnect', 'https://fonts.gstatic.com', '');
    add('stylesheet', `https://fonts.googleapis.com/css2?${googleQuery}&display=swap`);
    return () => {
      for (const node of nodes) node.remove();
    };
  }, [googleQuery]);
}

/** The document's own shape, held while the design and trip data load. */
const DocumentSkeleton: React.FC = () => (
  <div className="bg-background px-6 py-14 sm:px-12" aria-hidden>
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4">
      <Skeleton className="h-1 w-full rounded-none" />
      <Skeleton className="mt-6 h-2.5 w-52" />
      <Skeleton className="mt-3 h-10 w-full" />
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="mt-3 h-3.5 w-2/3" />
      <Skeleton className="mt-6 h-2.5 w-56" />
      <Skeleton className="mt-8 aspect-[3/2] w-full" />
    </div>
    <div className="mx-auto mt-16 max-w-2xl space-y-10">
      {[0, 1].map((i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-0.5 w-full rounded-none" />
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-3.5 w-1/2" />
          <Skeleton className="h-3.5 w-3/5" />
        </div>
      ))}
    </div>
  </div>
);

/** Shared shell for the two dead ends: a bad link, and a design we can't load. */
const DeadEnd: React.FC<{ title: string; body: string; tripId?: string; onRetry?: () => void }> = ({
  title,
  body,
  tripId,
  onRetry,
}) => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center print:hidden">
    <p className="font-display text-xl text-foreground">{title}</p>
    <p className="max-w-md text-sm text-muted-foreground">{body}</p>
    <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="h-11 sm:h-10">
          Try again
        </Button>
      )}
      <Button variant={onRetry ? 'ghost' : 'outline'} asChild className="h-11 sm:h-10">
        <Link to={tripId ? `/trip/${tripId}` : '/my-trips'}>
          {tripId ? 'Go to the trip' : 'Go to my trips'}
        </Link>
      </Button>
    </div>
  </div>
);

const PrintItinerary: React.FC = () => {
  const { tripId, designId } = useParams<{ tripId: string; designId: string }>();
  const validParams = isValidUUID(tripId) && isValidUUID(designId);

  const {
    data: designRow,
    isLoading: designLoading,
    error: designError,
    refetch: refetchDesign,
  } = useQuery({
    queryKey: ['print-design', designId],
    enabled: validParams,
    queryFn: async (): Promise<DesignRow> => {
      const { data, error } = await supabase
        .from('trip_print_designs')
        .select('id, trip_id, theme_prompt, design, created_at')
        .eq('id', designId!)
        .eq('trip_id', tripId!)
        .single();
      if (error || !data) throw error ?? new Error('Design not found');
      return data as unknown as DesignRow;
    },
  });

  const {
    data: tripData,
    isLoading: tripLoading,
    error: tripError,
    refetch: refetchTrip,
  } = useQuery({
    queryKey: ['print-trip-data', tripId],
    enabled: validParams,
    queryFn: () => fetchPdfTripData(tripId!, { showImages: true, showCosts: true }, 800),
    staleTime: 60_000,
  });

  const design = designRow?.design && designRow.design.palette ? designRow.design : null;
  const pairing = design ? getFontPairing(design.fontPairing) : null;
  useGoogleFonts(pairing?.googleQuery ?? null);

  useEffect(() => {
    if (design && tripId) {
      track('print_studio_document_viewed', { trip_id: tripId, theme: design.themeName });
    }
  }, [design, tripId]);

  const handlePrint = () => {
    if (tripId) track('print_studio_print_clicked', { trip_id: tripId });
    window.print();
  };

  if (!validParams) {
    return (
      <div className="min-h-screen bg-sand-100">
        <DeadEnd
          title="This print link isn't valid"
          body="The address is missing the trip or the edition it points to. Open the edition from the Print Studio on your trip."
        />
      </div>
    );
  }

  const isLoading = designLoading || tripLoading;
  const loadError = designError || tripError;
  const isReady = !isLoading && !!design && !!tripData;

  return (
    <div className="min-h-screen bg-sand-100 print:bg-transparent">
      {design && (
        <Helmet>
          <title>{`${design.cover.title} · WanderLuxe`}</title>
          <meta name="robots" content="noindex" />
        </Helmet>
      )}

      {/* Screen-only toolbar. Opaque rather than blurred: this page is a paper
          simulation, and a glass bar floating over it breaks the illusion. */}
      <div className="print:hidden sticky top-0 z-20 border-b border-border bg-background">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2 sm:px-4 sm:py-3">
          <Button variant="ghost" size="sm" asChild className="h-11 shrink-0 sm:h-9">
            <Link to={`/trip/${tripId}`}>
              <ArrowLeft className="mr-1.5 h-4 w-4 sm:mr-2" />
              <span className="sm:hidden">Back</span>
              <span className="hidden sm:inline">Back to trip</span>
            </Link>
          </Button>
          <p className="hidden min-w-0 flex-1 truncate text-center text-sm text-muted-foreground sm:block">
            {design ? (
              <>
                The <span className="font-medium text-foreground">{design.themeName}</span> Edition
              </>
            ) : (
              ' '
            )}
          </p>
          <div className="flex-1 sm:hidden" />
          <Button
            variant="sunset"
            size="sm"
            onClick={handlePrint}
            disabled={!isReady}
            className="h-11 shrink-0 sm:h-9"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-0 py-8 print:max-w-none print:p-0 sm:px-4">
        {isLoading && (
          <div className="shadow-warm-lg print:hidden" aria-busy="true">
            <span className="sr-only" role="status">
              Setting the type and mixing the inks…
            </span>
            <DocumentSkeleton />
          </div>
        )}

        {!isLoading && (loadError || !design) && (
          <DeadEnd
            title="We couldn't open this edition"
            tripId={tripId}
            body="The design may have been deleted, or you may need to sign in with an account that has access to this trip."
            onRetry={
              loadError
                ? () => {
                    void refetchDesign();
                    void refetchTrip();
                  }
                : undefined
            }
          />
        )}

        {isReady && (
          <div className="shadow-warm-lg print:shadow-none">
            <PrintDocument design={design!} data={tripData!} />
          </div>
        )}
      </div>
    </div>
  );
};

export default PrintItinerary;
