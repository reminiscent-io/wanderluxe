// src/utils/googleMapsLoader.ts
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface PlacePhotoMeta {
  height: number;
  width: number;
  /** Google Places Photo reference (REST) */
  photo_reference?: string;
  /** Some proxies may expand to a direct URL already */
  url?: string;
  /** HTML attributions that must be rendered with the photo (per Google TOS) */
  html_attributions?: string[];
}

export interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  website?: string;
  formatted_phone_number?: string;
  geometry?: {
    location: { lat: number; lng: number };
  };
  photos?: PlacePhotoMeta[];
}

export interface AutocompleteResult {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface GooglePlacesResponse {
  status: string;
  predictions?: any[];
  result?: PlaceResult;
}

/* -------------------------------------------------------------------------- */
/* Internal: resolve Supabase Functions base URL                              */
/* -------------------------------------------------------------------------- */

function getSupabaseBaseUrl(): string | null {
  // Next.js env (public)
  const nextUrl =
    typeof process !== "undefined"
      ? (process.env?.NEXT_PUBLIC_SUPABASE_URL as string | undefined)
      : undefined;

  // Vite env (public)
  // @ts-ignore runtime check for Vite
  const viteUrl =
    typeof import.meta !== "undefined"
      ? ((import.meta as any)?.env?.VITE_SUPABASE_URL as string | undefined)
      : undefined;

  // Fallback to whatever the Supabase client was initialized with (not officially typed but present)
  const clientUrl = (supabase as any)?.supabaseUrl as string | undefined;

  return nextUrl || viteUrl || clientUrl || null;
}

/* -------------------------------------------------------------------------- */
/* Public: Build a browser-usable photo URL that hits our Edge Function       */
/* -------------------------------------------------------------------------- */

export function getPhotoUrl(photo: PlacePhotoMeta, maxWidth: number = 640): string | null {
  // If the proxy already expanded to a direct URL, use it.
  if (photo?.url) return photo.url;

  if (!photo?.photo_reference) return null;

  const base = getSupabaseBaseUrl();
  if (!base) {
    console.warn("Supabase URL missing (NEXT_PUBLIC_SUPABASE_URL or VITE_SUPABASE_URL).");
    return null;
  }

  const params = new URLSearchParams({
    photo_reference: photo.photo_reference,
    maxwidth: String(maxWidth),
  });

  // Public, no auth required — your Edge Function serves/streams the image
  return `${base}/functions/v1/google-places-proxy?${params.toString()}`;
}

/* -------------------------------------------------------------------------- */
/* Autocomplete (GET via Edge Function)                                       */
/* -------------------------------------------------------------------------- */

export async function searchPlaces(
  input: string,
  types: string = "establishment"
): Promise<AutocompleteResult[]> {
  if (!input?.trim()) return [];

  try {
    const base = getSupabaseBaseUrl();
    if (!base) throw new Error("Supabase base URL not configured");

    const session = (await supabase.auth.getSession()).data.session;
    const token = session?.access_token;

    const params = new URLSearchParams({
      input,
      types,
      language: "en",
      // sessiontoken helps Google group keystrokes; your function accepts arbitrary query params
      sessiontoken: crypto.randomUUID(),
    });

    const res = await fetch(`${base}/functions/v1/google-places-proxy?${params.toString()}`, {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    const json: GooglePlacesResponse = await res.json();
    if (!res.ok) throw new Error(json as unknown as string);

    const predictions = Array.isArray(json.predictions) ? json.predictions : [];
    return predictions.map((p: any) => ({
      place_id: p.place_id,
      description: p.description,
      structured_formatting: {
        main_text:
          p.structured_formatting?.main_text ??
          p.terms?.[0]?.value ??
          p.description,
        secondary_text:
          p.structured_formatting?.secondary_text ??
          (Array.isArray(p.terms) && p.terms.length > 1
            ? p.terms.slice(1).map((t: any) => t.value).join(", ")
            : ""),
      },
    }));
  } catch (error) {
    console.error("searchPlaces error:", error);
    // fail silently to avoid noisy toasts on each keystroke
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/* Place Details (POST via Edge Function) — includes photos                   */
/* -------------------------------------------------------------------------- */

export async function getPlaceDetails(placeId: string): Promise<PlaceResult | null> {
  if (!placeId) return null;

  try {
    const base = getSupabaseBaseUrl();
    if (!base) throw new Error("Supabase base URL not configured");

    const session = (await supabase.auth.getSession()).data.session;
    const token = session?.access_token;

    const res = await fetch(`${base}/functions/v1/google-places-proxy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        placeId,
        // The Edge Function will default to include 'photos' if fields are omitted, but we’re explicit:
        fields: [
          "name",
          "formatted_address",
          "geometry",
          "place_id",
          "rating",
          "website",
          "formatted_phone_number",
          "photos",
        ],
      }),
    });

    const json: GooglePlacesResponse = await res.json();
    if (!res.ok) throw new Error((json as any)?.error || "Place details failed");

    return (json.result ?? null) as PlaceResult | null;
  } catch (error) {
    console.error("getPlaceDetails error:", error);
    toast.error("Failed to get location details");
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* No-op loader for compatibility (we’re not loading the Google JS SDK)       */
/* -------------------------------------------------------------------------- */

export async function loadGoogleMapsAPI(): Promise<boolean> {
  return true;
}
