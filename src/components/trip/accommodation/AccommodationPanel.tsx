// src/components/trip/accommodation/AccommodationPanel.tsx
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  formatDateSafe,
  compareDatesSafe,
  formatTime,
} from "@/utils/sidebarUtils";
import Header from "../_shared/Header";
import { parse, format } from "date-fns";

import {
  loadGoogleMapsAPI,
  getPlaceDetails,
  getPhotoUrl,
  type PlacePhotoMeta,
} from "@/utils/googleMapsLoader";

/* --------------------------- photo helpers --------------------------- */
const resolvePhotoUrl = (p: PlacePhotoMeta, maxWidth = 360): string | null => {
  const viaProxy = getPhotoUrl?.(p, maxWidth);
  if (viaProxy) return viaProxy;
  if (p?.url) return p.url;

  const nextKey =
    typeof process !== "undefined"
      ? (process.env?.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string | undefined)
      : undefined;
  // @ts-ignore SSR-safe check for Vite env
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
      getPlaceDetails(placeId)
        .then((res) => setPhotos(res?.photos ?? []))
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

  return (
    <div ref={ref}>
      {placeId && photos.length > 0 && (
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
                    alt={`${title || "Hotel"} photo ${i + 1}`}
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

/* ------------------------------- types -------------------------------- */
interface Props {
  accommodations: Array<{
    stay_id: string | number;
    hotel: string;
    hotel_checkin_date?: string | null;
    hotel_checkout_date?: string | null;
    checkin_time?: string | null;
    checkout_time?: string | null;
    cost?: number | null;
    currency?: string | null;
    /** Optional: when present, enables photo strip */
    hotel_place_id?: string | null;
  }>;
  onAdd: () => void;
  onEdit: (a: any) => void;
  isMobile: boolean;
  onClose: () => void;
  onBack: () => void;
}

export default function AccommodationPanel({
  accommodations,
  onAdd,
  onEdit,
  isMobile,
  onClose,
  onBack,
}: Props) {
  // Group by check-in date
  const grouped = accommodations.reduce<Record<string, typeof accommodations>>(
    (acc, a) => {
      const key = a.hotel_checkin_date ?? "No Date";
      (acc[key] ||= []).push(a);
      return acc;
    },
    {}
  );
  const dates = Object.keys(grouped).sort(compareDatesSafe);

  return (
    <div className="p-4">
      <Header title="Accommodations" {...{ isMobile, onBack, onClose }} />

      <Button
        size="sm"
        onClick={onAdd}
        className="mb-4 w-full bg-earth-500 text-white hover:bg-earth-600"
      >
        <Plus size={14} className="mr-1" /> Add Accommodation
      </Button>

      {dates.map((d) => (
        <div key={d} className="space-y-2">
          <h5 className="border-b border-sand-200 pb-1 text-xs font-medium text-earth-700">
            {formatDateSafe(d)}
          </h5>
          {grouped[d]
            .sort((a, b) =>
              (a.checkin_time ?? "").localeCompare(b.checkin_time ?? "")
            )
            .map((a) => {
              const cd = a.hotel_checkin_date || "";
              const od = a.hotel_checkout_date || cd;
              const sameDay = cd === od;

              let timeDisplay: string;
              if (sameDay) {
                timeDisplay = `${formatTime(a.checkin_time)} – ${formatTime(
                  a.checkout_time
                )}`;
              } else {
                const endDateObj = parse(od, "yyyy-MM-dd", new Date());
                const endLabel = format(endDateObj, "EEE, MMM d");
                timeDisplay = `${formatTime(a.checkin_time)} → ${endLabel} ${formatTime(
                  a.checkout_time
                )}`;
              }

              return (
                <div
                  key={a.stay_id}
                  className="ml-2 w-full rounded-lg bg-sand-50 p-3 text-left transition-colors hover:bg-sand-100"
                >
                  {/* Clickable header block */}
                  <button
                    onClick={() => onEdit(a)}
                    className="w-full text-left"
                  >
                    <h4 className="mb-1 text-sm font-medium">{a.hotel}</h4>
                    <p className="text-xs text-sand-600">
                      {timeDisplay}
                      {a.cost != null && (
                        <>
                          <br />
                          {(a.currency || "USD")} {a.cost.toLocaleString()}
                        </>
                      )}
                    </p>
                  </button>

                  {/* Non-clickable scroller below the header */}
                  <PhotoStrip placeId={a.hotel_place_id} title={a.hotel} />
                </div>
              );
            })}
        </div>
      ))}
    </div>
  );
}