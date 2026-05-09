// Pure helpers for parsing the model's `place_cards` JSON block out of its
// response and enriching the raw cards with verified Google Places data.
//
// Kept free of Deno / Node globals (beyond `console.warn`) so vitest can
// import this module directly from the src/ test suite.

export type PlaceResult = {
  name: string;
  place_id: string;
  formatted_address: string;
  maps_url: string;
  website?: string;
  rating?: number;
  phone?: string;
  price_level?: number;
  photo_reference?: string;
};

export type PlaceCard = {
  id: string;
  place_id: string;
  name: string;
  address: string;
  maps_url: string;
  website?: string;
  rating?: number;
  price_level?: number;
  phone?: string;
  photo_url?: string;
  booking_url?: string;
  blurb?: string;
  tags?: string[];
  // Marks the card as a hotel/stay. Lets the client offer Expedia booking
  // independently of `suggested_add` (which requires explicit dates).
  is_stay?: boolean;
  suggested_add?: {
    itemType: 'reservation' | 'activity' | 'accommodation';
    fields: Record<string, unknown>;
  };
};

export type RawPlaceCard = {
  place_id?: unknown;
  blurb?: unknown;
  tags?: unknown;
  booking_url?: unknown;
  is_stay?: unknown;
  suggested_add?: {
    itemType?: unknown;
    date?: unknown;
    time?: unknown;
    end_time?: unknown;
    party_size?: unknown;
    notes?: unknown;
    check_in_date?: unknown;
    check_out_date?: unknown;
    check_in_time?: unknown;
    check_out_time?: unknown;
  };
};

export type EnrichDropReason =
  | 'missing_place_id'
  | 'place_not_in_map'
  | 'unverified_booking_url_kept_card'
  | 'suggested_add_invalid';

export type EnrichDrop = { index: number; reason: EnrichDropReason };

export type EnrichResult = { cards: PlaceCard[]; drops: EnrichDrop[] };

// Accept `place_cards` (canonical) and `place_card` (singular, observed model
// drift). The `s?` is a mild leniency: any other suffix (e.g. `place_cardxx`)
// will still fall through to the no-match branch.
const PLACE_CARDS_CLOSED_REGEX = /```place_cards?\s*([\s\S]*?)```/;
const PLACE_CARDS_OPEN_REGEX = /```place_cards?\s*([\s\S]*)$/;

// Extract the longest balanced JSON array/object starting at index 0 of `src`.
// Used to recover items when the model's response was truncated before the
// closing ``` fence could be emitted (happens near maxOutputTokens).
export function extractBalancedJson(src: string): string | null {
  const trimmed = src.trimStart();
  if (!trimmed) return null;
  const first = trimmed[0];
  if (first !== '[' && first !== '{') return null;
  const open = first;
  const close = open === '[' ? ']' : '}';

  let depth = 0;
  let inString = false;
  let escape = false;
  let lastBalanced = -1;

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === open) {
      depth++;
    } else if (ch === close) {
      depth--;
      if (depth === 0) {
        lastBalanced = i;
        break;
      }
    }
  }

  if (lastBalanced === -1) return null;
  return trimmed.slice(0, lastBalanced + 1);
}

export function parsePlaceCardsBlock(response: string): {
  cleanContent: string;
  rawCards: RawPlaceCard[];
} {
  let jsonStr: string | null = null;
  let matchedRange: RegExp | null = null;

  const closed = response.match(PLACE_CARDS_CLOSED_REGEX);
  if (closed) {
    jsonStr = closed[1].trim();
    matchedRange = PLACE_CARDS_CLOSED_REGEX;
  } else {
    const open = response.match(PLACE_CARDS_OPEN_REGEX);
    if (open) {
      const balanced = extractBalancedJson(open[1]);
      if (balanced) {
        jsonStr = balanced;
        matchedRange = PLACE_CARDS_OPEN_REGEX;
      }
    }
  }

  if (!jsonStr || !matchedRange) {
    return { cleanContent: response, rawCards: [] };
  }

  let rawCards: RawPlaceCard[] = [];
  try {
    const parsed = JSON.parse(jsonStr);
    rawCards = (Array.isArray(parsed) ? parsed : [parsed]) as RawPlaceCard[];
  } catch (e) {
    console.warn('[ai-chat] place_cards parse failed', {
      jsonPreview: jsonStr.slice(0, 300),
      error: e instanceof Error ? e.message : String(e),
    });
  }

  const cleanContent = response.replace(matchedRange, '').trim();
  return { cleanContent, rawCards };
}

export function isDateInRange(date: string, arrival: string, departure: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(arrival) || !/^\d{4}-\d{2}-\d{2}$/.test(departure)) {
    return true; // Trip has no fixed dates — trust the model's date.
  }
  return date >= arrival && date <= departure;
}

export function isValidTime(time: unknown): time is string {
  return typeof time === 'string' && /^\d{2}:\d{2}$/.test(time);
}

export function buildSuggestedAdd(
  raw: RawPlaceCard['suggested_add'],
  place: PlaceResult,
  bookingUrl: string | undefined,
  arrival: string,
  departure: string,
): PlaceCard['suggested_add'] | undefined {
  if (!raw) return undefined;

  if (raw.itemType === 'accommodation') {
    if (typeof raw.check_in_date !== 'string' || typeof raw.check_out_date !== 'string') return undefined;
    if (!isDateInRange(raw.check_in_date, arrival, departure)) return undefined;
    if (!isDateInRange(raw.check_out_date, arrival, departure)) return undefined;
    if (raw.check_out_date <= raw.check_in_date) return undefined;
    return {
      itemType: 'accommodation',
      fields: {
        name: place.name,
        check_in_date: raw.check_in_date,
        check_out_date: raw.check_out_date,
        check_in_time: isValidTime(raw.check_in_time) ? raw.check_in_time : undefined,
        check_out_time: isValidTime(raw.check_out_time) ? raw.check_out_time : undefined,
        address: place.formatted_address || undefined,
        phone: place.phone || undefined,
        website: bookingUrl || place.website || undefined,
        place_id: place.place_id,
        notes: typeof raw.notes === 'string' ? raw.notes : undefined,
      },
    };
  }

  if (typeof raw.date !== 'string') return undefined;
  if (!isDateInRange(raw.date, arrival, departure)) return undefined;

  const itemType = raw.itemType === 'activity' ? 'activity' : 'reservation';

  if (itemType === 'reservation') {
    if (!isValidTime(raw.time)) return undefined;
    return {
      itemType: 'reservation',
      fields: {
        restaurant_name: place.name,
        date: raw.date,
        time: raw.time,
        party_size: typeof raw.party_size === 'number' ? raw.party_size : undefined,
        address: place.formatted_address || undefined,
        phone: place.phone || undefined,
        website: bookingUrl || place.website || undefined,
        notes: typeof raw.notes === 'string' ? raw.notes : undefined,
      },
    };
  }

  return {
    itemType: 'activity',
    fields: {
      name: place.name,
      date: raw.date,
      start_time: isValidTime(raw.time) ? raw.time : undefined,
      end_time: isValidTime(raw.end_time) ? raw.end_time : undefined,
      location: place.formatted_address || undefined,
      notes: typeof raw.notes === 'string' ? raw.notes : undefined,
    },
  };
}

export function enrichPlaceCards(
  rawCards: RawPlaceCard[],
  placesById: Map<string, PlaceResult>,
  verifiedUrls: Set<string>,
  supabaseUrl: string,
  arrival: string,
  departure: string,
): EnrichResult {
  const cards: PlaceCard[] = [];
  const drops: EnrichDrop[] = [];

  rawCards.forEach((raw, idx) => {
    if (typeof raw.place_id !== 'string' || !raw.place_id) {
      drops.push({ index: idx, reason: 'missing_place_id' });
      return;
    }
    const place = placesById.get(raw.place_id);
    if (!place) {
      drops.push({ index: idx, reason: 'place_not_in_map' });
      return;
    }

    const photo_url = place.photo_reference
      ? `${supabaseUrl}/functions/v1/google-places-proxy?photo_reference=${encodeURIComponent(place.photo_reference)}&maxwidth=800`
      : undefined;

    const bookingUrlRaw = typeof raw.booking_url === 'string' ? raw.booking_url : '';
    const bookingUrlVerified = bookingUrlRaw.length > 0 && verifiedUrls.has(bookingUrlRaw);
    const booking_url = bookingUrlVerified ? bookingUrlRaw : undefined;
    if (bookingUrlRaw.length > 0 && !bookingUrlVerified) {
      // Card is kept (the place is still useful) but we surface the drop so
      // operators can tell how often the model is hallucinating booking URLs.
      drops.push({ index: idx, reason: 'unverified_booking_url_kept_card' });
    }

    const suggested_add = buildSuggestedAdd(raw.suggested_add, place, booking_url, arrival, departure);
    if (raw.suggested_add && !suggested_add) {
      drops.push({ index: idx, reason: 'suggested_add_invalid' });
    }

    const tags = Array.isArray(raw.tags)
      ? raw.tags.filter((t): t is string => typeof t === 'string').slice(0, 4)
      : undefined;

    const blurb = typeof raw.blurb === 'string' ? raw.blurb.slice(0, 240) : undefined;

    const is_stay =
      raw.is_stay === true || suggested_add?.itemType === 'accommodation' || undefined;

    cards.push({
      id: `card-${idx}-${Date.now()}`,
      place_id: place.place_id,
      name: place.name,
      address: place.formatted_address,
      maps_url: place.maps_url,
      website: place.website,
      rating: place.rating,
      price_level: place.price_level,
      phone: place.phone,
      photo_url,
      booking_url,
      blurb,
      tags,
      is_stay,
      suggested_add,
    });
  });

  return { cards, drops };
}
