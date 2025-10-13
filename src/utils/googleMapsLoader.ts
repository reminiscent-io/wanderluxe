import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/** ---------------------------------------------
 * Types from our proxy
 * ----------------------------------------------*/
export interface PlacePhotoMeta {
  height: number;
  width: number;
  /** REST photo ref from Places */
  photo_reference?: string;
  /** If the proxy chose to expand to a full url already */
  url?: string;
  /** Raw HTML attribution strings from Google */
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
    location: {
      lat: number;
      lng: number;
    };
  };
  /** Photos as returned by our proxy (may include url or just photo_reference) */
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

export interface GooglePlacesResponse {
  predictions?: AutocompleteResult[];
  result?: PlaceResult;
  status: string;
}

/** ---------------------------------------------
 * Build a browser-usable photo URL using our edge function.
 * Uses VITE_SUPABASE_URL so the <img> loads directly; keeps API keys server-side.
 * ----------------------------------------------*/
export const getPhotoUrl = (
  photo: PlacePhotoMeta,
  maxWidth: number = 640
): string | null => {
  // If the proxy already returned a direct URL, use it.
  if (photo.url) return photo.url;

  // Otherwise construct a URL to our own function that proxies the photo.
  if (!photo.photo_reference) return null;

  const base =
    (import.meta as any)?.env?.VITE_SUPABASE_URL ||
    (window as any)?.SUPABASE_URL;

  if (!base) {
    console.warn("VITE_SUPABASE_URL missing; cannot build photo URL");
    return null;
  }

  const params = new URLSearchParams({
    photo_reference: photo.photo_reference,
    maxwidth: String(maxWidth),
  });

  // This assumes your google-places-proxy supports GET /?photo_reference=...&maxwidth=...
  // which is a common pattern for that function. If not, adjust to your function’s contract.
  return `${base}/functions/v1/google-places-proxy?${params.toString()}`;
};

/** ---------------------------------------------
 * Search via our secure proxy (GET)
 * ----------------------------------------------*/
export const searchPlaces = async (
  input: string,
  types: string = "establishment"
): Promise<AutocompleteResult[]> => {
  try {
    const params = new URLSearchParams({
      input,
      types,
      language: "en",
    });

    const { data, error } = await supabase.functions.invoke(
      `google-places-proxy?${params}`,
      { method: "GET" }
    );

    if (error) {
      console.error("Error searching places:", error);
      toast.error("Failed to search locations");
      return [];
    }

    const response: GooglePlacesResponse = data;
    if (response.status === "OK" && response.predictions) {
      return response.predictions;
    } else {
      console.warn("Google Places API returned non-OK status:", response.status);
      return [];
    }
  } catch (error) {
    console.error("Error in searchPlaces:", error);
    toast.error("Failed to search locations");
    return [];
  }
};

/** ---------------------------------------------
 * Details via our secure proxy (POST)
 * (Server should include 'photos' in the result)
 * ----------------------------------------------*/
export const getPlaceDetails = async (
  placeId: string
): Promise<PlaceResult | null> => {
  try {
    const { data, error } = await supabase.functions.invoke(
      "google-places-proxy",
      {
        method: "POST",
        body: JSON.stringify({ placeId, fields: ["name","formatted_address","formatted_phone_number","website","geometry","photos","rating"] }),
      }
    );

    if (error) {
      console.error("Error getting place details:", error);
      toast.error("Failed to get location details");
      return null;
    }

    const response: GooglePlacesResponse = data;
    if (response.status === "OK" && response.result) {
      return response.result;
    } else {
      console.warn("Google Places API returned non-OK status:", response.status);
      return null;
    }
  } catch (error) {
    console.error("Error in getPlaceDetails:", error);
    toast.error("Failed to get location details");
    return null;
  }
};

/** ---------------------------------------------
 * Legacy: noop so existing calls don't break
 * ----------------------------------------------*/
export const loadGoogleMapsAPI = async (): Promise<boolean> => {
  return true;
};
