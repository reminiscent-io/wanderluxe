import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, ClipboardPaste, FileImage, FileText, Loader2, X, AlertTriangle } from "lucide-react";
import * as z from "zod";

import TransportationDialog from "@/components/trip/transportation/TransportationDialog";
// TODO: confirm these three paths for your codebase:
import AccommodationDialog from "@/components/trip/accommodation/AccommodationDialog";
import ActivityDialog from "@/components/trip//day/activities/ActivityDialog";
import RestaurantReservationDialog from "@/components/trip/dining/RestaurantReservationDialog";

import type { Tables } from "@/integrations/supabase/types";

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

// ---- ENV endpoint (don’t hard-code) ----
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
    if (v.includes("shuttle")) return "shuttle";
    if (v.includes("rental")) return "rental_car";
    if (v.includes("car")) return "car_service";
    return "flight";
  };

  return {
    type: toType(f.type),
    provider: f.carrier ?? null,
    departure_location: f.departure_location ?? null,
    arrival_location: f.arrival_location ?? null,
    start_date: f.departure_date ?? null,
    start_time: toDbTime(f.departure_time),
    end_date: (f.arrival_date ?? f.departure_date) ?? null,
    end_time: toDbTime(f.arrival_time),
    confirmation_number: f.confirmation_number ?? null,
    cost: typeof f.cost === "number" ? f.cost : null,
    currency: f.currency ?? null,
    details: null,
  };
};

const mapToAccommodation = (f: Record<string, any>, tripId: string) => ({
  name: f.name ?? "",
  address: f.address ?? "",
  check_in_date: f.check_in_date ?? "",
  check_in_time: toDbTime(f.check_in_time),
  check_out_date: f.check_out_date ?? "",
  check_out_time: toDbTime(f.check_out_time),
  confirmation_number: f.confirmation_number ?? "",
  provider: f.provider ?? "",
  cost: typeof f.cost === "number" ? f.cost : null,
  currency: f.currency ?? "",
  trip_id: tripId,
});

const mapToActivity = (f: Record<string, any>, tripId: string) => ({
  name: f.name ?? "",
  date: f.date ?? "",
  start_time: toDbTime(f.start_time),
  end_time: toDbTime(f.end_time),
  location: f.location ?? "",
  provider: f.provider ?? "",
  confirmation_number: f.confirmation_number ?? "",
  notes: f.notes ?? "",
  trip_id: tripId,
});

const mapToReservation = (f: Record<string, any>, tripId: string) => ({
  restaurant_name: f.restaurant_name ?? "",
  date: f.date ?? "",
  time: toDbTime(f.time),
  party_size: typeof f.party_size === "number" ? f.party_size : null,
  address: f.address ?? "",
  confirmation_number: f.confirmation_number ?? "",
  trip_id: tripId,
});

export default function ChatView({ tripId, canEdit = true }: Props) {
  // Step + file
  const [itemType, setItemType] = useState<TravelItemType | "">("");
  const [file, setFile] = useState<File | null>(null);

  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewIsConverted, setPreviewIsConverted] = useState(false);
  const [convertedForSend, setConvertedForSend] = useState<File | null>(null);

  // Processing + OCR
  const [processing, setProcessing] = useState(false);
  const [edgeData, setEdgeData] = useState<EdgePayload | null>(null);
  const [showJson, setShowJson] = useState(false);

  // Dialogs
  const [openAcc, setOpenAcc] = useState(false);
  const [openTp, setOpenTp] = useState(false);
  const [openAct, setOpenAct] = useState(false);
  const [openRes, setOpenRes] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const onPasteClick = async () => {
    try {
      if (!navigator.clipboard || !("read" in navigator.clipboard)) {
        toast.info("Paste not supported. Use Upload instead.");
        return;
      }
      const items = await (navigator.clipboard as any).read();
      for (const it of items) {
        for (const type of it.types) {
          if (type.startsWith("image/") || type === "image/png" || type === "image/jpeg") {
            const blob = await it.getType(type);
            const pasted = new File([blob], `pasted.${type.split("/")[1]}`, { type });
            const err = validateFile(pasted); if (err) throw new Error(err);
            setFile(pasted);
            await preparePreview(pasted);
            return;
          }
          if (type === "application/pdf") {
            const blob = await it.getType(type);
            const pasted = new File([blob], "pasted.pdf", { type });
            const err = validateFile(pasted); if (err) throw new Error(err);
            setFile(pasted);
            await preparePreview(pasted);
            return;
          }
        }
      }
      toast.message("No image or PDF found in clipboard");
    } catch (e: any) {
      toast.error(e?.message ?? "Clipboard read blocked by browser.");
    }
  };

  // --- PDF → PNG (first page)
  const pdfFirstPageToPng = async (pdfFile: File): Promise<File> => {
    const ab = await pdfFile.arrayBuffer();
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf");
    const worker = await import("pdfjs-dist/legacy/build/pdf.worker.min.js?url");
    (pdfjs as any).GlobalWorkerOptions.workerSrc = (worker as any).default;
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

    if (f.type === "application/pdf") {
      const converted = await pdfFirstPageToPng(f);
      const url = URL.createObjectURL(converted);
      setPreviewUrl(url);
      setConvertedForSend(converted);
      setPreviewIsConverted(true);
    } else {
      const url = URL.createObjectURL(f);
      setPreviewUrl(url);
      setConvertedForSend(null);
      setPreviewIsConverted(false);
    }
  };

  // --- Call Edge Function + Zod-validate
  const extract = async (original: File, type: TravelItemType) => {
    setProcessing(true);
    try {
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

      const asText = await resp.text(); // robust: read text then parse as JSON
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

  const handleExtract = async () => {
    if (!itemType) return toast.info("Choose what to create first.");
    if (!file) return toast.info("Upload or paste an image/PDF.");

    const data = await extract(file, itemType as TravelItemType);
    if (!data) return;

    // Open the appropriate dialog
    switch (data.itemType) {
      case "accommodation": setOpenAcc(true); break;
      case "transportation": setOpenTp(true); break;
      case "activity": setOpenAct(true); break;
      case "reservation": setOpenRes(true); break;
    }
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
    <div className="max-w-3xl mx-auto">
      <Card className="mt-2">
        <CardHeader>
          <CardTitle className="text-earth-600">Create from a document</CardTitle>
          <p className="text-sm text-sand-600">
            Select what you’re creating, then upload or paste a confirmation. We’ll prefill the form for you to review.
          </p>
        </CardHeader>
        <CardContent>
          {/* 1. Choose type */}
          <div className="space-y-2 mb-4">
            <Label className="text-sm">1. What do you want to create?</Label>
            <Select value={itemType} onValueChange={(v) => setItemType(v as TravelItemType)}>
              <SelectTrigger className="bg-white">
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

              {/* Live preview (image or first page of PDF) */}
              {previewUrl ? (
                <div className="mt-3 relative">
                  <img
                    src={previewUrl}
                    alt="Upload preview"
                    className="max-h-56 rounded-md border border-sand-200 shadow-sm object-contain bg-white"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -top-3 -right-3 rounded-full"
                    onClick={() => { revokePreview(); setFile(null); setEdgeData(null); }}
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
              className="bg-earth-500 hover:bg-earth-600"
              onClick={handleExtract}
              disabled={!canEdit || !itemType || !file || processing}
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

          {/* Optional JSON debug */}
          {edgeData && (
            <div className="mt-3">
              <Button variant="ghost" size="sm" onClick={() => setShowJson((v) => !v)}>
                {showJson ? "Hide parsed JSON" : "Show parsed JSON"}
              </Button>
              {showJson && (
                <pre className="mt-2 text-xs overflow-x-auto max-h-56 bg-white border border-sand-200 p-2 rounded">
{JSON.stringify(edgeData, null, 2)}
                </pre>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prefilled dialogs */}
      {openAcc && (
        <AccommodationDialog
          open={openAcc}
          onOpenChange={setOpenAcc}
          tripId={tripId}
          initialData={initAccommodation as any}
          onSuccess={() => setEdgeData(null)}
        />
      )}
      {openTp && (
        <TransportationDialog
          open={openTp}
          onOpenChange={setOpenTp}
          tripId={tripId}
          initialData={initTransportation as Partial<Tables<"transportation">>}
          onSuccess={() => setEdgeData(null)}
        />
      )}
      {openAct && (
        <ActivityDialog
          open={openAct}
          onOpenChange={setOpenAct}
          tripId={tripId}
          initialData={initActivity as any}
          onSuccess={() => setEdgeData(null)}
        />
      )}
      {openRes && (
        <RestaurantReservationDialog
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
