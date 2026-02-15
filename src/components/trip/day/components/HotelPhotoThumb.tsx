import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { getPlaceDetails, getPhotoUrl, loadGoogleMapsAPI } from '@/utils/googleMapsLoader';
import { getCachedPlacePhotos, setCachedPlacePhotos } from '@/utils/placePhotoCache';
import type { PlacePhotoMeta } from '@/utils/googleMapsLoader';

interface HotelPhotoThumbProps {
  placeId: string | null | undefined;
  title?: string;
  className?: string;
  size?: 'sm' | 'md';
}

const sizeMap = { sm: 'h-10 w-14', md: 'h-12 w-16' };

export default function HotelPhotoThumb({
  placeId,
  title = 'Hotel',
  className = '',
  size = 'sm',
}: HotelPhotoThumbProps) {
  const [photo, setPhoto] = useState<PlacePhotoMeta | null>(null);
  const [triggered, setTriggered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
        setPhoto(cached[0]);
        return;
      }

      getPlaceDetails(placeId)
        .then((res) => {
          const ph = res?.photos ?? [];
          if (ph.length) {
            setPhoto(ph[0]);
            setCachedPlacePhotos(placeId, ph);
          }
        })
        .catch(() => setPhoto(null));
    };

    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              load();
              obs.disconnect();
            }
          });
        },
        { rootMargin: '80px' }
      );
      obs.observe(el);
      return () => obs.disconnect();
    } else {
      load();
    }
  }, [placeId, triggered]);

  if (!placeId) return null;

  const src = photo ? (getPhotoUrl?.(photo, 160) || (photo as any)?.url) : null;

  return (
    <div
      ref={ref}
      className={cn(
        'flex-shrink-0 overflow-hidden rounded-lg border border-sand-200',
        !src ? 'bg-sand-100' : '',
        sizeMap[size],
        className
      )}
    >
      {src && (
        <img
          src={src}
          alt={`${title} photo`}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  );
}

