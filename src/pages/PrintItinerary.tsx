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
import { ArrowLeft, Loader2, Printer } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { fetchPdfTripData } from '@/services/pdf/data';
import { Button } from '@/components/ui/button';
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

function useGoogleFonts(googleQuery: string | null) {
  useEffect(() => {
    if (!googleQuery) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${googleQuery}&display=swap`;
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, [googleQuery]);
}

const PrintItinerary: React.FC = () => {
  const { tripId, designId } = useParams<{ tripId: string; designId: string }>();
  const validParams = isValidUUID(tripId) && isValidUUID(designId);

  const { data: designRow, isLoading: designLoading, error: designError } = useQuery({
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

  const { data: tripData, isLoading: tripLoading, error: tripError } = useQuery({
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
      <div className="min-h-screen flex items-center justify-center text-earth-600">
        This print link is not valid.
      </div>
    );
  }

  const isLoading = designLoading || tripLoading;
  const loadError = designError || tripError;

  return (
    <div className="min-h-screen bg-sand-100 print:bg-transparent">
      {design && (
        <Helmet>
          <title>{`${design.cover.title} · WanderLuxe`}</title>
          <meta name="robots" content="noindex" />
        </Helmet>
      )}

      {/* Screen-only toolbar */}
      <div className="print:hidden sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/trip/${tripId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to trip
            </Link>
          </Button>
          <div className="min-w-0 flex-1 text-center">
            {design && (
              <p className="truncate text-sm text-muted-foreground">
                The <span className="font-medium text-foreground">{design.themeName}</span> Edition
              </p>
            )}
          </div>
          <Button variant="sunset" size="sm" onClick={handlePrint} disabled={!design || !tripData}>
            <Printer className="mr-2 h-4 w-4" />
            Print / Save PDF
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-earth-600 print:hidden">
          <Loader2 className="h-6 w-6 animate-spin text-sand-400" />
          <p className="text-sm">Setting the type and mixing the inks…</p>
        </div>
      )}

      {!isLoading && (loadError || !design) && (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center text-earth-600 print:hidden">
          <p className="font-display text-xl text-earth-800">We couldn't open this edition</p>
          <p className="max-w-md text-sm text-muted-foreground">
            The design may have been deleted, or you may need to sign in with an account
            that has access to this trip.
          </p>
          <Button variant="outline" asChild className="mt-2">
            <Link to={`/trip/${tripId}`}>Go to the trip</Link>
          </Button>
        </div>
      )}

      {!isLoading && design && tripData && (
        <div className="mx-auto max-w-3xl px-0 py-8 print:max-w-none print:p-0 sm:px-4">
          <div className="shadow-warm-lg print:shadow-none">
            <PrintDocument design={design} data={tripData} />
          </div>
        </div>
      )}
    </div>
  );
};

export default PrintItinerary;
