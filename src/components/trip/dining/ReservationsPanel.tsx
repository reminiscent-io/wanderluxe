// src/components/trip/dining/ReservationsPanel.tsx
import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { formatDateSafe, compareDatesSafe, formatTime } from "@/utils/sidebarUtils";
import Header from "../_shared/Header";

import {
  loadGoogleMapsAPI,
  getPlaceDetails,
  getPhotoUrl,
  type PlacePhotoMeta,
} from "@/utils/googleMapsLoader";
import {
  getCachedPlacePhotos,
  setCachedPlacePhotos,
  clearExpiredPlacePhotoCache,
} from "@/utils/placePhotoCache";

/* --------------------------- photo helpers --------------------------- */
const resolvePhotoUrl = (p: PlacePhotoMeta, maxWidth = 360): string | null => {
  const viaProxy = getPhotoUrl?.(p, maxWidth);
  if (viaProxy) return viaProxy;
  if (p?.url) return p.url;

  const nextKey =
    typeof process !== "undefined"
      ? (process.env?.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string | undefined)
      : undefined;
  // @ts-ignore SSR-safe check (Vite)
  const viteKey: string | undefined =
    (typeof import.meta !== "undefined" && (import.meta as any)?.env?.VITE_GOOGLE_MAPS_API_KEY) || undefined;
  const key = nextKey || viteKey;

  if (key && p?.photo_reference) {
    const params = new URLSearchParams({
      maxwidth: String(maxWidth),
      photo_reference: p.photo_reference,
      key,
    });
    return `https://maps.googleapis.com/maps/api/place/photo?${params.toString()}`;
  }
  return null;
};

function warmImageCache(photos: PlacePhotoMeta[]) {
  const sample = photos.slice(0, 3);
  const widths = [320, 480, 640];
  for (const ph of sample) {
    for (const w of widths) {
      const url = resolvePhotoUrl(ph, w);
      if (!url) continue;
      const img = new Image();
      img.decoding = "async";
      img.loading = "eager";
      img.src = url;
    }
  }
}

/* -------------------------- lazy photo strip ------------------------- */
function PhotoStrip({ placeId, title }: { placeId?: string | null; title: string }) {
  const [photos, setPhotos] = useState<PlacePhotoMeta[]>([]);
  const [triggered, setTriggered] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadGoogleMapsAPI().catch(() => {});
  }, []);

  useEffect(() => {
    if (!placeId || triggered) return;
    const el = ref.current;
    if (!el) return;

    const load = () => {
      setTriggered(true);

      const cached = getCachedPlacePhotos(placeId);
      if (cached?.length) {
        setPhotos(cached);
        warmImageCache(cached);
        return;
      }

      getPlaceDetails(placeId)
        .then((res) => {
          const ph = res?.photos ?? [];
          setPhotos(ph);
          setCachedPlacePhotos(placeId, ph);
          warmImageCache(ph);
        })
        .catch(() => setPhotos([]));
    };

    if ("IntersectionObserver" in window) {
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              load();
              obs.disconnect();
            }
          });
        },
        { rootMargin: "120px" }
      );
      obs.observe(el);
      return () => obs.disconnect();
    } else {
      load();
    }
  }, [placeId, triggered]);

  if (!placeId) return null;

  return (
    <div ref={ref}>
      {photos.length > 0 && (
        <div className="mt-2 -mx-1 overflow-x-auto">
          <div className="flex gap-2 px-1 py-1 snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {photos.slice(0, 10).map((p, i) => {
              const url320  = resolvePhotoUrl(p, 320);
              const url480  = resolvePhotoUrl(p, 480);
              const url640  = resolvePhotoUrl(p, 640);
              const url896  = resolvePhotoUrl(p, 896);
              const src = url480 || url640 || url896 || url320;
              if (!src) return null;

              const srcSet = [
                url320 && `${url320} 320w`,
                url480 && `${url480} 480w`,
                url640 && `${url640} 640w`,
                url896 && `${url896} 896w`,
              ]
                .filter(Boolean)
                .join(", ");

              const sizes = "(min-width: 768px) 384px, (min-width: 640px) 320px, 240px";
              const attribution = p.html_attributions?.[0];

              return (
                <div key={`${p.photo_reference || p.url || i}`} className="relative flex-none snap-start">
                  <img
                    src={src}
                    srcSet={srcSet}
                    sizes={sizes}
                    alt={`${title || "Restaurant"} photo ${i + 1}`}
                    className="
                      h-28 w-44
                      sm:h-32 sm:w-56
                      md:h-32 md:w-64
                      rounded-md object-cover border border-sand-200
                    "
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                  {attribution && (
                    <div
                      className="absolute bottom-1 right-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white"
                      dangerouslySetInnerHTML={{ __html: attribution }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------------------- types --------------------------------- */
interface Props {
  reservations: Array<{
    id: string | number;
    restaurant_name: string;
    reservation_time?: string | null;
    number_of_people?: number | null;
    cost?: number | null;
    currency?: string | null;
    place_id?: string | null; // enables photo strip when present
    trip_days?: { date?: string | null } | null;
  }>;
  onAdd: () => void;
  onEdit: (r: any) => void;
  isMobile: boolean;
  onClose: () => void;
  onBack: () => void;
}

/* --------------------------------- view ---------------------------------- */
export default function ReservationsPanel({
  reservations,
  onAdd,
  onEdit,
  isMobile,
  onClose,
  onBack,
}: Props) {
  // Housekeeping: sweep expired entries occasionally
  useEffect(() => {
    clearExpiredPlacePhotoCache();
  }, []);

  const grouped = reservations.reduce((acc: Record<string, any[]>, r) => {
    const d = r.trip_days?.date || "No Date";
    (acc[d] ||= []).push(r);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort(compareDatesSafe);

  return (
    <div className="p-4">
      <Header title="Reservations" {...{ isMobile, onBack, onClose }} />

      <Button
        size="sm"
        onClick={onAdd}
        className="mb-4 w-full bg-earth-500 text-white hover:bg-earth-600"
      >
        <Plus size={14} className="mr-1" /> Add Reservation
      </Button>

      {dates.map((d) => (
        <div key={d} className="space-y-2">
          <h5 className="border-b border-sand-200 pb-1 text-xs font-medium text-earth-700">
            {formatDateSafe(d)}
          </h5>
          {grouped[d]
            .sort((a, b) => (a.reservation_time || "").localeCompare(b.reservation_time || ""))
            .map((r) => (
              <div
                key={r.id}
                className="ml-2 w-full rounded-lg bg-sand-50 p-3 text-left transition-colors hover:bg-sand-100"
              >
                {/* Clickable header area */}
                <button onClick={() => onEdit(r)} className="w-full text-left">
                  <h4 className="mb-1 text-sm font-medium">{r.restaurant_name}</h4>
                  <p className="text-xs text-sand-600">{formatTime(r.reservation_time)}</p>
                  {r.number_of_people && (
                    <p className="text-xs text-sand-600">{r.number_of_people} people</p>
                  )}
                  {typeof r.cost === "number" && (
                    <p className="text-xs text-sand-600">
                      {(r.currency || "USD")} {r.cost.toLocaleString()}
                    </p>
                  )}
                </button>

                {/* Non-clickable, scrollable photo strip */}
                <PhotoStrip placeId={r.place_id} title={r.restaurant_name} />
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}