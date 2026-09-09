// /trip/:tripId/print/:designId — the Print Studio output page.
//
// Loads the stored AI design spec (RLS: trip access) and the same trip data
// module the PDF export uses, injects the design's Google Fonts pairing, and
// renders the keepsake document with a screen-only toolbar. Printing is the
// browser's native dialog (Save as PDF included), so output quality rides on
// real print CSS rather than a canvas rasterizer.
//
// An edition has two lives. While it is live it re-renders from current trip
// data, so a document generated halfway through planning keeps up with the
// plan. Finalizing freezes the itinerary into the row and the page starts
// drawing from that copy instead — the point at which it stops being a view
// and becomes a keepsake. Either way the words are the traveler's to change:
// copy edits are stored beside the AI's spec, never over it.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Lock, LockOpen, Pencil, Printer, X } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { buildPdfTripData, fetchPdfTripData, type PdfTripRows } from '@/services/pdf/data';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getFontPairing, type PrintDesignSpec } from '@/lib/printDesign/spec';
import {
  applyCopyOverrides,
  countCopyEdits,
  fieldForKey,
  originalCopy,
  pruneCopyOverrides,
  sanitizeCopyOverrides,
  type PrintCopyOverrides,
} from '@/lib/printDesign/edits';
import PrintDocument, { type CopyRenderer } from '@/components/trip/print-studio/PrintDocument';
import EditableCopy from '@/components/trip/print-studio/EditableCopy';
import { useTripPermissions } from '@/hooks/use-trip-permissions';
import { track } from '@/lib/analytics';

const isValidUUID = (s: string | undefined): s is string =>
  !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

interface DesignRow {
  id: string;
  trip_id: string;
  theme_prompt: string | null;
  design: PrintDesignSpec;
  copy_overrides: PrintCopyOverrides | null;
  content_snapshot: PdfTripRows | null;
  finalized_at: string | null;
  created_at: string;
}

const PRINT_OPTS = { showImages: true, showCosts: true } as const;

/** Width the cover image is cropped to. Matches the document's measure. */
const CONTENT_WIDTH = 800;

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
  const queryClient = useQueryClient();
  const { canEdit } = useTripPermissions(tripId);

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
        .select('id, trip_id, theme_prompt, design, copy_overrides, content_snapshot, finalized_at, created_at')
        .eq('id', designId!)
        .eq('trip_id', tripId!)
        .single();
      if (error || !data) throw error ?? new Error('Design not found');
      return data as unknown as DesignRow;
    },
  });

  const isFinalized = !!designRow?.finalized_at;
  const snapshot = designRow?.content_snapshot ?? null;

  const {
    data: tripData,
    isLoading: tripLoading,
    error: tripError,
    refetch: refetchTrip,
  } = useQuery({
    // finalized_at is part of the key so freezing or reopening an edition
    // swaps the source of the itinerary rather than serving a stale render.
    queryKey: ['print-trip-data', tripId, designRow?.finalized_at ?? 'live'],
    enabled: validParams && !!designRow,
    queryFn: () =>
      snapshot
        ? buildPdfTripData(snapshot, PRINT_OPTS, CONTENT_WIDTH)
        : fetchPdfTripData(tripId!, PRINT_OPTS, CONTENT_WIDTH),
    // A frozen edition cannot change, so it never needs refetching.
    staleTime: isFinalized ? Infinity : 60_000,
  });

  const baseDesign = designRow?.design && designRow.design.palette ? designRow.design : null;
  const dayDates = useMemo(() => tripData?.days.map((d) => d.date) ?? [], [tripData]);

  // Sanitized on the way in, not just on the way out. The browser writes this
  // column directly, so what comes back is checked before it is set in type.
  const savedOverrides = useMemo(
    () => sanitizeCopyOverrides(designRow?.copy_overrides, dayDates),
    [designRow?.copy_overrides, dayDates]
  );

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<PrintCopyOverrides>({});

  const startEditing = useCallback(() => {
    setDraft(savedOverrides);
    setIsEditing(true);
    if (tripId) track('print_studio_edit_opened', { trip_id: tripId });
  }, [savedOverrides, tripId]);

  const cancelEditing = useCallback(() => {
    setDraft({});
    setIsEditing(false);
  }, []);

  const saveMutation = useMutation({
    mutationFn: async (): Promise<PrintCopyOverrides> => {
      if (!baseDesign) throw new Error('No design loaded');
      const pruned = pruneCopyOverrides(baseDesign, sanitizeCopyOverrides(draft, dayDates));
      const { error } = await supabase
        .from('trip_print_designs')
        .update({ copy_overrides: pruned })
        .eq('id', designId!);
      if (error) throw error;
      return pruned;
    },
    onSuccess: (pruned) => {
      queryClient.setQueryData(['print-design', designId], (prev: DesignRow | undefined) =>
        prev ? { ...prev, copy_overrides: pruned } : prev
      );
      setIsEditing(false);
      setDraft({});
      if (tripId) track('print_studio_copy_saved', { trip_id: tripId, fields: Object.keys(pruned).length });
      toast.success(Object.keys(pruned).length ? 'Your words are saved.' : 'Back to the original words.');
    },
    onError: () => toast.error("We couldn't save those edits. Please try again."),
  });

  const finalizeMutation = useMutation({
    mutationFn: async (finalize: boolean) => {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error('Not signed in');

      const resp = await fetch(`/api/trips/${tripId}/print-design/${designId}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ finalize }),
      });
      const body = await resp.json().catch((): null => null);
      if (!resp.ok) throw new Error(body?.message || 'Request failed');
      return { finalize, finalized_at: body?.finalized_at ?? null };
    },
    onSuccess: ({ finalize, finalized_at }) => {
      queryClient.setQueryData(['print-design', designId], (prev: DesignRow | undefined) =>
        prev ? { ...prev, finalized_at } : prev
      );
      void queryClient.invalidateQueries({ queryKey: ['print-design', designId] });
      if (tripId) track('print_studio_finalize', { trip_id: tripId, finalize });
      toast.success(
        finalize
          ? 'Finalized. This edition is now a fixed record of the trip as it stands.'
          : 'Reopened. This edition follows the trip again.'
      );
    },
    onError: (e: Error) =>
      toast.error(e.message === 'Not signed in' ? 'Please sign in again.' : "We couldn't update this edition."),
  });

  /**
   * In edit mode the field shows the draft verbatim — including a cleared
   * required field. applyCopyOverrides would substitute the AI's line back in
   * at that point, which on screen reads as the editor refusing a deletion.
   */
  const renderCopy: CopyRenderer = useCallback(
    (key) => {
      if (!baseDesign) return null;
      const field = fieldForKey(key);
      const original = originalCopy(baseDesign, key);
      const current = draft[key] ?? original;
      const isDirty = current !== original;

      return (
        <EditableCopy
          fieldKey={key}
          value={current}
          onChange={(value) => setDraft((d) => ({ ...d, [key]: value }))}
          max={field.max}
          label={field.label}
          placeholder={field.hint}
          edited={isDirty}
          onRevert={
            isDirty
              ? () =>
                  setDraft((d) => {
                    const next = { ...d };
                    delete next[key];
                    return next;
                  })
              : undefined
          }
        />
      );
    },
    [baseDesign, draft]
  );

  const activeOverrides = isEditing ? draft : savedOverrides;
  const design = baseDesign ? applyCopyOverrides(baseDesign, activeOverrides) : null;
  const editCount = baseDesign ? countCopyEdits(baseDesign, savedOverrides) : 0;

  useEffect(() => {
    if (design && tripId) {
      track('print_studio_document_viewed', { trip_id: tripId, theme: design.themeName });
    }
    // Fires per edition, not per keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designRow?.id, tripId]);

  const pairing = design ? getFontPairing(design.fontPairing) : null;
  useGoogleFonts(pairing?.googleQuery ?? null);

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
  const isSaving = saveMutation.isPending;
  const isFinalizing = finalizeMutation.isPending;
  const canEditCopy = canEdit && !isFinalized && isReady;

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
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={cancelEditing}
                disabled={isSaving}
                className="h-11 shrink-0 sm:h-9"
              >
                <X className="mr-1.5 h-4 w-4 sm:mr-2" />
                Cancel
              </Button>
              <p className="hidden min-w-0 flex-1 truncate text-center text-sm text-muted-foreground sm:block">
                Click any line to rewrite it
              </p>
              <div className="flex-1 sm:hidden" />
              <Button
                variant="sunset"
                size="sm"
                onClick={() => saveMutation.mutate()}
                disabled={isSaving}
                className="h-11 shrink-0 sm:h-9"
              >
                <Check className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving…' : 'Save'}
              </Button>
            </>
          ) : (
            <>
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
                    {isFinalized && <span className="text-muted-foreground"> · finalized</span>}
                    {!isFinalized && editCount > 0 && (
                      <span className="text-muted-foreground"> · your words</span>
                    )}
                  </>
                ) : (
                  ' '
                )}
              </p>
              <div className="flex-1 sm:hidden" />

              {canEditCopy && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={startEditing}
                  className="h-11 shrink-0 sm:h-9"
                  title="Rewrite the words on this edition"
                >
                  <Pencil className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Edit words</span>
                </Button>
              )}

              {canEdit && isReady && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => finalizeMutation.mutate(!isFinalized)}
                  disabled={isFinalizing}
                  className="h-11 shrink-0 sm:h-9"
                  title={
                    isFinalized
                      ? 'Let this edition follow the trip again'
                      : 'Freeze the itinerary into this edition'
                  }
                >
                  {isFinalized ? (
                    <LockOpen className="h-4 w-4 sm:mr-2" />
                  ) : (
                    <Lock className="h-4 w-4 sm:mr-2" />
                  )}
                  <span className="hidden sm:inline">{isFinalized ? 'Reopen' : 'Finalize'}</span>
                </Button>
              )}

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
            </>
          )}
        </div>

        {/* One line of state, only when there is something to say. */}
        {isReady && !isEditing && (isFinalized || editCount > 0) && (
          <div className="mx-auto max-w-3xl px-3 pb-2 sm:px-4">
            <p className="text-xs text-muted-foreground">
              {isFinalized ? (
                <>
                  Finalized {new Date(designRow!.finalized_at!).toLocaleDateString()} — the itinerary in
                  this edition is fixed and no longer follows the trip.
                </>
              ) : (
                <>
                  {editCount} {editCount === 1 ? 'line' : 'lines'} rewritten. The itinerary still follows
                  the trip; finalize to fix it in place.
                </>
              )}
            </p>
          </div>
        )}
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
            <PrintDocument
              design={design!}
              data={tripData!}
              renderCopy={isEditing ? renderCopy : undefined}
              isEditing={isEditing}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PrintItinerary;
