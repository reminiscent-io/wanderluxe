import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, ClipboardPaste, FileImage, FileText, Loader2, X, AlertTriangle, Zap, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import * as z from "zod";

import TransportationDialog from "@/components/trip/transportation/TransportationDialog";
import AccommodationDialog from "@/components/trip/accommodation/AccommodationDialog";
import ActivityDialog from "@/components/trip/day/activities/ActivityDialog";
import RestaurantReservationDialog from "@/components/trip/dining/RestaurantReservationDialog";

import type { Tables } from "@/integrations/supabase/types";

// ✅ pdfjs-dist v5.x ships the worker as .mjs — import the URL statically so Vite bundles it
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

type TravelItemType = "accommodation" | "transportation" | "activity" | "reservation";
interface Props { tripId: string; canEdit?: boolean; }

const okTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
const MAX_FILE_MB = 15;
const toDbTime = (t?: string | null) => (t && /^\d{2}:\d{2}$/.test(t) ? t : null);

// ---- Edge response schema (Zod) ----
const baseFields = z.record(z.unknown());
const edgeResponseSchema = z.object({
  itemType: z.enum(["accommodation", "transportation", "activity", "reservation"]),
  fields: baseFields,
  missingRequired: z.array(z.string()),
  meta: z.object({ model: z.string(), pagesUsed: z.number() }).optional(),
});
type EdgePayload = z.infer<typeof edgeResponseSchema>;

// ---- ENV endpoint (don't hard-code) ----
const PARSE_ENDPOINT =
  import.meta.env.VITE_PARSE_TRAVEL_DOC_URL ||
  "https://arnengxblsfnezrqcsxw.functions.supabase.co/parse-travel-doc";

// --------- OCR → initial dialog mapping helpers ----------
const mapToTransportation = (f: Record<string, any>): Partial<Tables<"transportation">> => {
  const toType = (raw?: string | null): Tables<"transportation">["type"] | undefined => {
    const v = (raw || "").toLowerCase();
    if (v.includes("flight") || v.includes("air")) return "flight";
    if (v.includes("train")) return "train";
    if (v.includes("ferry")) return "ferry";
    if (v.includes("shuttle") || v.includes("bus") || v.includes("coach")) return "shuttle";
    if (v.includes("rental")) return "rental_car";
    if (v.includes("uber") || v.includes("lyft") || v.includes("taxi") || v.includes("car")) return "car_service";
    if (v.includes("car_service")) return "car_service";
    if (v.includes("rental_car")) return "rental_car";
    return (f.type as any) || "flight";
  };

  return {
    type: toType(f.type),
    provider: f.carrier ?? null,
    departure_location: f.departure_location ?? null,
    arrival_location: f.arrival_location ?? null,
    start_date: f.departure_date ?? "",
    start_time: toDbTime(f.departure_time),
    end_date: (f.arrival_date ?? f.departure_date) ?? "",
    end_time: toDbTime(f.arrival_time),
    confirmation_number: f.confirmation_number ?? null,
    cost: typeof f.cost === "number" ? f.cost : null,
    currency: f.currency ?? "USD",
    details: null,
  };
};

// Matches AccommodationForm schema (hotel*, times, cost/currency, contact)
const mapToAccommodation = (f: Record<string, any>, tripId: string) => {
  const parts: string[] = [];
  if (f.provider) parts.push(`Booked via ${f.provider}`);
  if (f.confirmation_number) parts.push(`Confirmation ${f.confirmation_number}`);

  return {
    hotel: f.name ?? "",
    hotel_details: parts.join(" • "),
    hotel_url: f.website ?? "",
    hotel_checkin_date: f.check_in_date ?? "",
    hotel_checkout_date: f.check_out_date ?? "",
    checkin_time: toDbTime(f.check_in_time) ?? "15:00",
    checkout_time: toDbTime(f.check_out_time) ?? "11:00",
    cost: typeof f.cost === "number" ? f.cost : null,
    currency: f.currency ?? "USD",
    hotel_address: f.address ?? "",
    hotel_phone: f.phone ?? "",
    hotel_place_id: "",
    hotel_website: f.website ?? "",
    expense_type: "accommodation",
    is_paid: false,
    expense_date: "",
    order_index: 0,
    travelers: [],
    trip_id: tripId,
  };
};

// Matches ActivityFormData (title, description, etc.)
const mapToActivity = (f: Record<string, any>, tripId: string) => ({
  title: f.name ?? "",
  description: f.notes ?? "",
  date: f.date ?? "",
  start_time: toDbTime(f.start_time) ?? "",
  end_time: toDbTime(f.end_time) ?? "",
  cost: typeof f.cost === "number" ? String(f.cost) : "",
  currency: f.currency ?? "USD",
  travelers: [],
  trip_id: tripId,
});

// Matches RestaurantReservationForm (reservation_date, reservation_time, number_of_people, etc.)
const mapToReservation = (f: Record<string, any>, tripId: string) => ({
  restaurant_name: f.restaurant_name ?? "",
  reservation_date: f.date ?? "",
  reservation_time: toDbTime(f.time) ?? "",
  number_of_people: typeof f.party_size === "number" ? f.party_size : undefined,
  address: f.address ?? "",
  phone_number: f.phone ?? undefined,
  website: f.website ?? undefined,
  notes: f.notes ?? "",
  cost: typeof f.cost === "number" ? f.cost : undefined,
  currency: f.currency ?? "USD",
  place_id: undefined,
  rating: undefined,
  trip_id: tripId,
});

interface ImportUsage {
  used: number;
  limit: number;
  tier: 'free' | 'pro';
  resetAt: string;
}

export default function ChatView({ tripId, canEdit = true }: Props) {
  // Step + file
  const [itemType, setItemType] = useState<TravelItemType | "">("");
  const [file, setFile] = useState<File | null>(null);

  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewIsConverted, setPreviewIsConverted] = useState(false);
  const [convertedForSend, setConvertedForSend] = useState<File | null>(null);
  const [previewReady, setPreviewReady] = useState(false);

  // Processing + OCR
  const [processing, setProcessing] = useState(false);
  const [edgeData, setEdgeData] = useState<EdgePayload | null>(null);

  // Import usage tracking
  const [importUsage, setImportUsage] = useState<ImportUsage | null>(null);

  // Dialogs
  const [openAcc, setOpenAcc] = useState(false);
  const [openTp, setOpenTp] = useState(false);
  const [openAct, setOpenAct] = useState(false);
  const [openRes, setOpenRes] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sanitize preview URL: only allow blob: protocol to prevent XSS via URL injection
  const sanitizedPreviewUrl = useMemo<string | null>(() => {
    if (!previewUrl) return null;
    try {
      const parsed = new URL(previewUrl);
      if (parsed.protocol === 'blob:') return previewUrl;
    } catch {
      // Invalid URL — reject
    }
    return null;
  }, [previewUrl]);

  // Fetch import usage on mount
  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        const token = session?.session?.access_token;
        if (!token) return;

        const resp = await fetch('/api/ai-imports/usage', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (resp.ok) {
          const data = await resp.json();
          setImportUsage(data);
        }
      } catch (e) {
        console.error('Failed to fetch import usage:', e);
      }
    };
    fetchUsage();
  }, []);

  // ---------- helpers ----------
  const validateFile = useCallback((f: File) => {
    if (!okTypes.includes(f.type)) return "Only JPG, PNG, or PDF files are allowed.";
    if (f.size > MAX_FILE_MB * 1024 * 1024) return `Max file size is ${MAX_FILE_MB} MB.`;
    return null;
  }, []);

  const revokePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewIsConverted(false);
  };
  useEffect(() => () => revokePreview(), []); // cleanup on unmount

  const pickFile = () => fileInputRef.current?.click();

  const onInputFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const f = files[0];
    const err = validateFile(f);
    if (err) return toast.error(err);
    setFile(f);
    preparePreview(f).catch((e) => toast.error(`Preview failed: ${String(e?.message || e)}`));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!e.dataTransfer.files?.length) return;
    onInputFiles(e.dataTransfer.files);
  };

  const extractFileFromClipboardItem = async (it: any): Promise<File | null> => {
    for (const type of it.types) {
      const isImage = type.startsWith("image/");
      const isPdf = type === "application/pdf";
      if (!isImage && !isPdf) continue;

      const blob = await it.getType(type);
      const name = isPdf ? "pasted.pdf" : `pasted.${type.split("/")[1]}`;
      const pasted = new File([blob], name, { type });
      const err = validateFile(pasted);
      if (err) throw new Error(err);
      return pasted;
    }
    return null;
  };

  const onPasteClick = async () => {
    try {
      if (!navigator.clipboard || !("read" in navigator.clipboard)) {
        toast.info("Paste not supported. Use Upload instead.");
        return;
      }
      const items = await (navigator.clipboard as any).read();
      for (const it of items) {
        const pasted = await extractFileFromClipboardItem(it);
        if (pasted) {
          setFile(pasted);
          await preparePreview(pasted);
          return;
        }
      }
      toast.message("No image or PDF found in clipboard");
    } catch (e: any) {
      toast.error(e?.message ?? "Clipboard read blocked by browser.");
    }
  };

  // --- PDF → PNG (first page) using pdfjs-dist v5 build + statically imported worker URL
  const pdfFirstPageToPng = async (pdfFile: File): Promise<File> => {
    const ab = await pdfFile.arrayBuffer();

    // Keep this import dynamic to avoid loading pdf.js unless needed.
    // @ts-expect-error - pdfjs-dist types may not be fully compatible with dynamic import
    const pdfjs = await import("pdfjs-dist/build/pdf");
    (pdfjs as any).GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

    const pdf = await (pdfjs as any).getDocument({ data: ab }).promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;

    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/png")
    );

    return new File([blob], pdfFile.name.replace(/\.pdf$/i, ".png"), {
      type: "image/png",
      lastModified: Date.now(),
    });
  };

  // --- Build preview (and prepare converted file we also reuse for extraction)
  const preparePreview = async (f: File) => {
    revokePreview();
    setConvertedForSend(null);
    setEdgeData(null);
    setPreviewReady(false);

    if (f.type === "application/pdf") {
      const converted = await pdfFirstPageToPng(f);
      const url = URL.createObjectURL(converted);
      setPreviewUrl(url);
      setConvertedForSend(converted);
      setPreviewIsConverted(true);
      setPreviewReady(true);
    } else {
      const url = URL.createObjectURL(f);
      setPreviewUrl(url);
      setConvertedForSend(null);
      setPreviewIsConverted(false);
      setPreviewReady(true);
    }
  };

  // --- Call Edge Function + Zod-validate
  const extract = async (original: File, type: TravelItemType) => {
    setProcessing(true);
    try {
      if (original.type === "application/pdf" && !convertedForSend) {
        throw new Error("We couldn't render the PDF. Please try again or upload an image.");
      }
      const toSend = convertedForSend || original;

      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const fd = new FormData();
      fd.append("itemType", type);
      fd.append("file", toSend);

      const resp = await fetch(PARSE_ENDPOINT, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });

      const asText = await resp.text();
      let parsed: any;
      try { parsed = JSON.parse(asText); } catch {
        throw new Error(asText || `Extraction failed (${resp.status})`);
      }
      if (!resp.ok || parsed?.error) throw new Error(parsed?.error || `Extraction failed (${resp.status})`);

      const safe = edgeResponseSchema.parse(parsed);
      setEdgeData(safe);
      toast.success("Details extracted. Prefilling the form…");
      return safe;
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to extract details.");
      return null;
    } finally {
      setProcessing(false);
    }
  };

  const isAtImportLimit = (): boolean => {
    if (!importUsage) return false;
    if (importUsage.tier === 'pro' || importUsage.limit === -1) return false;
    return importUsage.used >= importUsage.limit;
  };

  const trackUsageIncrement = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) return;
      const usageResp = await fetch('/api/ai-imports/usage', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (usageResp.ok) {
        const usageData = await usageResp.json();
        setImportUsage(prev => prev ? { ...prev, used: usageData.used } : null);
      }
    } catch (e) {
      console.error('Failed to update import usage:', e);
    }
  };

  const openDialogForType = (type: TravelItemType) => {
    switch (type) {
      case "accommodation": setOpenAcc(true); break;
      case "transportation": setOpenTp(true); break;
      case "activity": setOpenAct(true); break;
      case "reservation": setOpenRes(true); break;
    }
  };

  const handleExtract = async () => {
    if (!itemType) return toast.info("Choose what to create first.");
    if (!file) return toast.info("Upload or paste an image/PDF.");
    if (!previewReady) return toast.error("Preview isn't ready yet. If you uploaded a PDF, we're rendering the first page.");

    if (isAtImportLimit()) {
      toast.error(`You've reached your daily limit of ${importUsage!.limit} imports. Upgrade to Pro for unlimited imports!`);
      return;
    }

    const data = await extract(file, itemType as TravelItemType);
    if (!data) return;

    await trackUsageIncrement();
    openDialogForType(data.itemType);
  };

  // --------- map OCR → initialData ----------
  const initTransportation = useMemo<Partial<Tables<"transportation">>>(
    () => (edgeData?.itemType === "transportation" ? mapToTransportation(edgeData.fields) : {}),
    [edgeData]
  );
  const initAccommodation = useMemo(
    () => (edgeData?.itemType === "accommodation" ? mapToAccommodation(edgeData.fields, tripId) : {}),
    [edgeData, tripId]
  );
  const initActivity = useMemo(
    () => (edgeData?.itemType === "activity" ? mapToActivity(edgeData.fields, tripId) : {}),
    [edgeData, tripId]
  );
  const initReservation = useMemo(
    () => (edgeData?.itemType === "reservation" ? mapToReservation(edgeData.fields, tripId) : {}),
    [edgeData, tripId]
  );

  const missing = edgeData?.missingRequired ?? [];

  // ---------- UI ----------
  return (
    <div className="max-w-4xl mx-auto">
      <Card className="mt-1 bg-background">
        <CardHeader>
          <CardTitle className="text-earth-600">Upload a booking confirmation</CardTitle>
        </CardHeader>
        <CardContent>
          {/* 1. Choose type */}
          <div className="space-y-2 mb-4">
            <Label className="text-sm">1. Select item type (e.g., transportation)</Label>
            <Select value={itemType} onValueChange={(v) => setItemType(v as TravelItemType)}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Select item type…" />
              </SelectTrigger>
              <SelectContent className="z-[300] bg-sand-50">
                <SelectItem value="accommodation">🏨 Hotel / Accommodation</SelectItem>
                <SelectItem value="transportation">✈️ Transportation</SelectItem>
                <SelectItem value="activity">🎟️ Activity</SelectItem>
                <SelectItem value="reservation">🍽️ Restaurant Reservation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 2. Upload / Paste */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="rounded-md border-2 border-dashed border-sand-300 p-6 text-center bg-sand-50"
          >
            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept="image/*,.pdf"
              onChange={(e) => onInputFiles(e.target.files)}
            />

            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-2">
                <FileImage className="w-5 h-5 text-earth-500" />
                <FileText className="w-5 h-5 text-earth-500" />
              </div>
              <p className="text-sm text-sand-700">
                2. Drag & drop an image/PDF here, or use the buttons below.
              </p>
              <p className= "text-xs text-sand-500 italic">
                All files are securely passed to Google's Gemini API; we do not store any uploads
              </p>

              {/* Live preview (image or first page of PDF) */}
              {sanitizedPreviewUrl ? (
                <div className="mt-3 relative">
                  <img
                    src={sanitizedPreviewUrl}
                    alt="Upload preview"
                    referrerPolicy="no-referrer"
                    className="max-h-56 rounded-md border border-sand-200 shadow-warm-sm object-contain bg-background"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -top-3 -right-3 rounded-full"
                    onClick={() => { revokePreview(); setFile(null); setEdgeData(null); setPreviewReady(false); }}
                    aria-label="Remove file"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <p className="text-xs text-sand-600 mt-1">
                    {previewIsConverted ? "Previewing first page of PDF" : "Previewing image"}
                  </p>
                </div>
              ) : null}

              {/* File name fallback */}
              {file && !previewUrl && (
                <p className="text-xs text-sand-600 mt-2">
                  Selected: <span className="font-medium">{file.name}</span>
                </p>
              )}

              <div className="flex gap-2 mt-3">
                <Button variant="outline" onClick={pickFile} disabled={!canEdit}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
                <Button variant="outline" onClick={onPasteClick} disabled={!canEdit}>
                  <ClipboardPaste className="w-4 h-4 mr-2" />
                  Paste
                </Button>
              </div>
            </div>
          </div>

          {/* 3. Extract */}
          <div className="mt-4 flex justify-end">
            <Button
              className="bg-earth-500 hover:bg-earth-600 text-white"
              onClick={handleExtract}
              disabled={!canEdit || !itemType || !file || !previewReady || processing}
            >
              {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Extract details
            </Button>
          </div>

          {/* Missing required hints (from edge) */}
          {!!missing.length && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="text-sm">
                Missing required: <span className="font-medium">{missing.join(", ")}</span>. You can fill these in the form.
              </div>
            </div>
          )}

          {/* Import usage meter */}
          {importUsage && (
            <div className="mt-4 px-3 py-2 bg-sand-50 border border-sand-200 rounded-md">
              {importUsage.tier === 'pro' || importUsage.limit === -1 ? (
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-medium text-amber-700">Pro - Unlimited imports</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Zap className={cn('w-3.5 h-3.5', importUsage.used >= importUsage.limit * 0.8 ? 'text-amber-500' : 'text-sand-400')} />
                      <span className={cn(
                        'text-xs font-medium',
                        importUsage.used >= importUsage.limit ? 'text-red-600' : importUsage.used >= importUsage.limit * 0.8 ? 'text-amber-600' : 'text-earth-600'
                      )}>
                        {importUsage.used}/{importUsage.limit} imports today
                      </span>
                    </div>
                    <span className="text-xs text-sand-400">Resets at midnight</span>
                  </div>
                  <div className="h-1.5 bg-sand-200 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-300',
                        importUsage.used >= importUsage.limit ? 'bg-red-500' : importUsage.used >= importUsage.limit * 0.8 ? 'bg-amber-500' : 'bg-earth-500'
                      )}
                      style={{ width: `${Math.min((importUsage.used / importUsage.limit) * 100, 100)}%` }}
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prefilled dialogs */}
      {openAcc && (
        <AccommodationDialog
          key={`acc-${JSON.stringify(initAccommodation)}`}
          open={openAcc}
          onOpenChange={setOpenAcc}
          tripId={tripId}
          initialData={initAccommodation as any}
          onSuccess={() => setEdgeData(null)}
        />
      )}
      {openTp && (
        <TransportationDialog
          key={`tp-${JSON.stringify(initTransportation)}`}
          open={openTp}
          onOpenChange={setOpenTp}
          tripId={tripId}
          initialData={initTransportation as Partial<Tables<"transportation">>}
          onSuccess={() => setEdgeData(null)}
        />
      )}
      {openAct && (
        <ActivityDialog
          key={`act-${JSON.stringify(initActivity)}`}
          open={openAct}
          onOpenChange={setOpenAct}
          tripId={tripId}
          initialData={initActivity as any}
          onSuccess={() => setEdgeData(null)}
        />
      )}
      {openRes && (
        <RestaurantReservationDialog
          key={`res-${JSON.stringify(initReservation)}`}
          open={openRes}
          onOpenChange={setOpenRes}
          tripId={tripId}
          initialData={initReservation as any}
          onSuccess={() => setEdgeData(null)}
        />
      )}
    </div>
  );
}
