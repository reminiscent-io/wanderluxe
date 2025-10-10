// This replaces the old interactive chat with a guided OCR-to-form flow.
// - Step 1: User selects one of: accommodation | transportation | activity | reservation
// - Step 2: User uploads image/PDF or clicks Paste to read from clipboard
// - Step 3: We POST to the Edge Function, receive structured JSON, and
// - Step 4: Open the appropriate dialog prefilled. The user reviews & saves.
//
// Security & infra:
// - We follow your legacy pattern of calling a Supabase Edge Function with the
//   user's bearer token (as ChatView previously did).:contentReference[oaicite:5]{index=5}
//
// RLS:
// - Saving still occurs through your existing dialogs/tables and respects
//   user_has_edit_permission(trip_id), etc. (no DB change).:contentReference[oaicite:6]{index=6}:contentReference[oaicite:7]{index=7}

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, ClipboardPaste, FileImage, FileText, Loader2 } from "lucide-react";

// === Dialogs ===
// TransportationDialog path verified from your repo structure:
import TransportationDialog from "@/components/trip/transportation/TransportationDialog";

// TODO: adjust these three imports to your actual paths:
import AccommodationDialog from "@/components/trip/accommodation/AccommodationDialog"; 
import ActivityDialog from "@/components/trip/day/activities/ActivityDialog"; 
import RestaurantReservationDialog from "@/components/trip/dining/RestaurantReservationDialog"; 

import type { Tables } from "@/integrations/supabase/types";

// Your project’s functions domain. Mirror the legacy pattern used for chat-ai.:contentReference[oaicite:8]{index=8}
const PARSE_ENDPOINT = "https://arnengxblsfnezrqcsxw.functions.supabase.co/parse-travel-doc";

type TravelItemType = "accommodation" | "transportation" | "activity" | "reservation";

interface ChatViewProps {
  tripId: string;
  canEdit?: boolean;
}

type OCRAccommodation = {
  name?: string | null;
  address?: string | null;
  check_in_date?: string | null;  // YYYY-MM-DD
  check_in_time?: string | null;  // HH:mm
  check_out_date?: string | null;
  check_out_time?: string | null;
  confirmation_number?: string | null;
  provider?: string | null;
  cost?: number | null;
  currency?: string | null;
};

type OCRTransportation = {
  type?: string | null; // flight, train, etc.
  carrier?: string | null;
  departure_location?: string | null;
  arrival_location?: string | null;
  departure_date?: string | null; // YYYY-MM-DD
  departure_time?: string | null; // HH:mm
  arrival_date?: string | null;
  arrival_time?: string | null;
  confirmation_number?: string | null;
  cost?: number | null;
  currency?: string | null;
};

type OCRActivity = {
  name?: string | null;
  date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  provider?: string | null;
  confirmation_number?: string | null;
  notes?: string | null;
};

type OCRReservation = {
  restaurant_name?: string | null;
  date?: string | null;
  time?: string | null;        // HH:mm
  party_size?: number | null;
  address?: string | null;
  confirmation_number?: string | null;
};

const okTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];

const MAX_FILE_MB = 15;

const toDbTime = (t?: string | null) => (t && /^\d{2}:\d{2}$/.test(t) ? t : null);

export default function ChatView({ tripId, canEdit = true }: ChatViewProps) {
  const { toast } = useToast();

  // Step selection + file
  const [itemType, setItemType] = useState<TravelItemType | "">("");
  const [file, setFile] = useState<File | null>(null);

  // Processing state
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OCR result
  const [ocrData, setOcrData] = useState<any>(null);

  // Dialog open flags
  const [openAcc, setOpenAcc] = useState(false);
  const [openTp, setOpenTp] = useState(false);
  const [openAct, setOpenAct] = useState(false);
  const [openRes, setOpenRes] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --------- helpers ----------
  const validate = useCallback((f: File) => {
    if (!okTypes.includes(f.type)) return "Only JPG, PNG, or PDF files are allowed.";
    if (f.size > MAX_FILE_MB * 1024 * 1024)
      return `Max file size is ${MAX_FILE_MB} MB.`;
    return null;
  }, []);

  const pickFile = () => fileInputRef.current?.click();

  const onInputFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    const err = validate(f);
    if (err) {
      toast({ title: "Invalid file", description: err, variant: "destructive" });
      return;
    }
    setFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!e.dataTransfer.files?.length) return;
    onInputFiles(e.dataTransfer.files);
  };

  const onPasteClick = async () => {
    try {
      if (!navigator.clipboard || !("read" in navigator.clipboard)) {
        toast({
          title: "Paste not supported",
          description: "Use the upload button or drag-and-drop.",
        });
        return;
      }
      const items = await (navigator.clipboard as any).read();
      for (const it of items) {
        for (const type of it.types) {
          if (type.startsWith("image/") || type === "image/png" || type === "image/jpeg") {
            const blob = await it.getType(type);
            const pasted = new File([blob], `pasted.${type.split("/")[1]}`, { type });
            const err = validate(pasted);
            if (err) throw new Error(err);
            setFile(pasted);
            return;
          }
          if (type === "application/pdf") {
            const blob = await it.getType(type);
            const pasted = new File([blob], "pasted.pdf", { type });
            const err = validate(pasted);
            if (err) throw new Error(err);
            setFile(pasted);
            return;
          }
        }
      }
      toast({
        title: "No image or PDF found in clipboard",
        description: "Copy a screenshot or PDF, then press Paste again.",
      });
    } catch (e: any) {
      toast({
        title: "Paste failed",
        description: e?.message ?? "Clipboard read is blocked by the browser.",
        variant: "destructive",
      });
    }
  };

  // Convert first page of a PDF to PNG (client-side) so the Edge Function sees an image.
  // Keeps us from storing PDFs anywhere, but still supports PDF confirmations.
  const pdfFirstPageToPng = async (pdfFile: File): Promise<File> => {
    const ab = await pdfFile.arrayBuffer();
    // Use the correct import paths for pdfjs-dist with Vite
    const pdfjs = await import("pdfjs-dist");
    const pdfjsWorker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker.default;

    const pdf = await pdfjs.getDocument({ data: ab }).promise;
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

  // POST to the Edge Function
  const extract = async (f: File, type: TravelItemType) => {
    setProcessing(true);
    setError(null);
    try {
      let toSend = f;
      if (f.type === "application/pdf") {
        // Convert first page to image for vision model.
        toSend = await pdfFirstPageToPng(f);
      }

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

      const json = await resp.json();
      if (!resp.ok || json?.error) {
        throw new Error(json?.error || `Extraction failed (${resp.status})`);
      }
      setOcrData(json);
      return json;
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Failed to extract details.");
      toast({ title: "Extraction error", description: String(e?.message || e), variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleExtract = async () => {
    if (!itemType) {
      toast({ title: "Select item type", description: "Choose what to create first." });
      return;
    }
    if (!file) {
      toast({ title: "Add a file", description: "Upload or paste an image/PDF." });
      return;
    }
    const data = await extract(file, itemType as TravelItemType);
    if (!data) return;

    // Open the right dialog after we have data
    switch (itemType) {
      case "accommodation":
        setOpenAcc(true);
        break;
      case "transportation":
        setOpenTp(true);
        break;
      case "activity":
        setOpenAct(true);
        break;
      case "reservation":
        setOpenRes(true);
        break;
    }
  };

  // ------------- mappings → dialog initialData ----------------

  const initTransportation = useMemo<Partial<Tables<"transportation">>>(() => {
    const t = (ocrData || {}) as OCRTransportation;
    const toType = (raw?: string | null): Tables<"transportation">["type"] | undefined => {
      const v = (raw || "").toLowerCase();
      if (v.includes("flight") || v.includes("air")) return "flight";
      if (v.includes("train")) return "train";
      if (v.includes("ferry")) return "ferry";
      if (v.includes("shuttle")) return "shuttle";
      if (v.includes("rental")) return "rental_car";
      if (v.includes("car")) return "car_service";
      return "flight"; // sensible default; user can change
    };

    const depDate = t.departure_date || null;
    const arrDate = t.arrival_date || t.departure_date || null;
    const depTime = toDbTime(t.departure_time);
    const arrTime = toDbTime(t.arrival_time);

    return {
      type: toType(t.type),
      provider: t.carrier ?? null,
      departure_location: t.departure_location ?? null,
      arrival_location: t.arrival_location ?? null,
      start_date: depDate,
      start_time: depTime,
      end_date: arrDate,
      end_time: arrTime,
      confirmation_number: t.confirmation_number ?? null,
      cost: t.cost ?? null,
      currency: t.currency ?? null,
      details: null,
    };
  }, [ocrData]);

  // NOTE: I’m passing minimal initialData to the other dialogs; adjust keys if your dialogs expect different names.

  const initAccommodation = useMemo(() => {
    const a = (ocrData || {}) as OCRAccommodation;
    return {
      name: a.name ?? "",
      address: a.address ?? "",
      check_in_date: a.check_in_date ?? "",
      check_in_time: toDbTime(a.check_in_time),
      check_out_date: a.check_out_date ?? "",
      check_out_time: toDbTime(a.check_out_time),
      confirmation_number: a.confirmation_number ?? "",
      provider: a.provider ?? "",
      cost: a.cost ?? null,
      currency: a.currency ?? "",
      trip_id: tripId,
    } as any;
  }, [ocrData, tripId]);

  const initActivity = useMemo(() => {
    const a = (ocrData || {}) as OCRActivity;
    return {
      name: a.name ?? "",
      date: a.date ?? "",
      start_time: toDbTime(a.start_time),
      end_time: toDbTime(a.end_time),
      location: a.location ?? "",
      provider: a.provider ?? "",
      confirmation_number: a.confirmation_number ?? "",
      notes: a.notes ?? "",
      trip_id: tripId,
    } as any;
  }, [ocrData, tripId]);

  const initReservation = useMemo(() => {
    const r = (ocrData || {}) as OCRReservation;
    return {
      restaurant_name: r.restaurant_name ?? "",
      date: r.date ?? "",
      time: toDbTime(r.time),
      party_size: r.party_size ?? null,
      address: r.address ?? "",
      confirmation_number: r.confirmation_number ?? "",
      trip_id: tripId,
    } as any;
  }, [ocrData, tripId]);

  // ------------- render ----------------

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="mt-2">
        <CardHeader>
          <CardTitle className="text-earth-600">Create from a document</CardTitle>
          <p className="text-sm text-sand-600">
            Select what you’re creating, then upload or paste an image/PDF of the confirmation. We’ll prefill the form so you can review & save.
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
              {file && (
                <p className="text-xs text-sand-600">
                  Selected: <span className="font-medium">{file.name}</span>
                </p>
              )}
              <div className="flex gap-2 mt-2">
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

          {error && (
            <p className="text-sm text-red-600 mt-2" role="alert">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Prefilled dialogs */}
      {/* Accommodation */}
      {openAcc && (
        <AccommodationDialog
          open={openAcc}
          onOpenChange={setOpenAcc}
          tripId={tripId}
          initialData={initAccommodation as any}
          onSuccess={() => setOcrData(null)}
        />
      )}

      {/* Transportation */}
      {openTp && (
        <TransportationDialog
          open={openTp}
          onOpenChange={setOpenTp}
          tripId={tripId}
          initialData={initTransportation as Partial<Tables<"transportation">>}
          onSuccess={() => setOcrData(null)}
        />
      )}

      {/* Activity */}
      {openAct && (
        <ActivityDialog
          open={openAct}
          onOpenChange={setOpenAct}
          tripId={tripId}
          initialData={initActivity as any}
          onSuccess={() => setOcrData(null)}
        />
      )}

      {/* Restaurant Reservation */}
      {openRes && (
        <RestaurantReservationDialog
          open={openRes}
          onOpenChange={setOpenRes}
          tripId={tripId}
          initialData={initReservation as any}
          onSuccess={() => setOcrData(null)}
        />
      )}
    </div>
  );
}
