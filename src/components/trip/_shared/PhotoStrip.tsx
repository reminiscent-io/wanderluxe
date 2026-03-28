import { useEffect, useRef, useState } from "react";
import DOMPurify from 'dompurify';
import {
  loadGoogleMapsAPI,
  getPlaceDetails,
  getPhotoUrl,
  type PlacePhotoMeta,
} from "@/utils/googleMapsLoader";
import {
  getCachedPlacePhotos,
  setCachedPlacePhotos,
} from "@/utils/placePhotoCache";

/* --------------------------- photo helpers --------------------------- */
export const resolvePhotoUrl = (p: PlacePhotoMeta, maxWidth = 360): string | null => {
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

export function warmImageCache(photos: PlacePhotoMeta[]) {
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
interface PhotoStripProps {
  placeId?: string | null;
  title: string;
}

export default function PhotoStrip({ placeId, title }: PhotoStripProps) {
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
                    alt={`${title} photo ${i + 1}`}
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
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(attribution) }}
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
