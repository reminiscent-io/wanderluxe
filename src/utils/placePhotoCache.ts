// src/utils/placePhotoCache.ts
import type { PlacePhotoMeta } from "@/utils/googleMapsLoader";

// In-memory cache for the life of the tab
const mem = new Map<string, { ts: number; photos: PlacePhotoMeta[] }>();

const KEY_PREFIX = "wlx:placePhotos:v1:";
const DEFAULT_TTL_MS = (() => {
  // Optional override via env (milliseconds)
  let v: number | undefined;
  try {
    // Next.js style
    if (typeof process !== "undefined") {
      const raw = process.env?.NEXT_PUBLIC_PLACE_PHOTO_CACHE_TTL_MS;
      if (raw) v = Number(raw);
    }
    // Vite style
    // @ts-ignore SSR-safe
    const vite = (typeof import.meta !== "undefined" && (import.meta as any)?.env?.VITE_PLACE_PHOTO_CACHE_TTL_MS) || undefined;
    if (!v && vite) v = Number(vite);
  } catch {}
  return Number.isFinite(v) && v! > 0 ? v! : 1000 * 60 * 60 * 12; // 12 hours
})();

function canUseSessionStorage() {
  try {
    if (typeof window === "undefined") return false;
    const testKey = "__wlx_ss_test__";
    window.sessionStorage.setItem(testKey, "1");
    window.sessionStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export function getCachedPlacePhotos(
  placeId: string,
  ttlMs: number = DEFAULT_TTL_MS
): PlacePhotoMeta[] | null {
  const now = Date.now();
  // memory first
  const hit = mem.get(placeId);
  if (hit && now - hit.ts < ttlMs) return hit.photos;

  // then sessionStorage
  if (canUseSessionStorage()) {
    try {
      const raw = window.sessionStorage.getItem(KEY_PREFIX + placeId);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.ts && Array.isArray(parsed.photos) && now - parsed.ts < ttlMs) {
          mem.set(placeId, { ts: parsed.ts, photos: parsed.photos });
          return parsed.photos as PlacePhotoMeta[];
        }
      }
    } catch {}
  }
  return null;
}

export function setCachedPlacePhotos(placeId: string, photos: PlacePhotoMeta[]) {
  const entry = { ts: Date.now(), photos };
  mem.set(placeId, entry);
  if (canUseSessionStorage()) {
    try {
      window.sessionStorage.setItem(KEY_PREFIX + placeId, JSON.stringify(entry));
    } catch {}
  }
}

function clearExpiredMemoryEntries(ttlMs: number): void {
  const now = Date.now();
  for (const [k, v] of mem) {
    if (now - v.ts >= ttlMs) mem.delete(k);
  }
}

function clearExpiredSessionEntries(ttlMs: number): void {
  if (!canUseSessionStorage()) return;
  try {
    const now = Date.now();
    const toRemove: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i += 1) {
      const key = window.sessionStorage.key(i);
      if (!key || !key.startsWith(KEY_PREFIX)) continue;
      const raw = window.sessionStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (!parsed?.ts || now - parsed.ts >= ttlMs) toRemove.push(key);
    }
    toRemove.forEach((k) => window.sessionStorage.removeItem(k));
  } catch {}
}

/** Best-effort sweep of expired entries (no-op if storage is unavailable). */
export function clearExpiredPlacePhotoCache(ttlMs: number = DEFAULT_TTL_MS) {
  clearExpiredMemoryEntries(ttlMs);
  clearExpiredSessionEntries(ttlMs);
}