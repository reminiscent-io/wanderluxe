import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildSuggestedAdd,
  enrichPlaceCards,
  extractBalancedJson,
  isDateInRange,
  isValidTime,
  parsePlaceCardsBlock,
  type PlaceResult,
  type RawPlaceCard,
} from '../../supabase/functions/ai-chat/placeCards';

const ARRIVAL = '2026-05-10';
const DEPARTURE = '2026-05-15';
const SUPABASE_URL = 'https://example.supabase.co';

function makePlace(partial: Partial<PlaceResult> & { place_id: string; name: string }): PlaceResult {
  return {
    formatted_address: '1 rue Fake, Paris',
    maps_url: `https://www.google.com/maps/place/?q=place_id:${partial.place_id}`,
    ...partial,
  } as PlaceResult;
}

describe('extractBalancedJson', () => {
  it('returns the full balanced array when present', () => {
    expect(extractBalancedJson('[1,2,3] trailing junk')).toBe('[1,2,3]');
  });

  it('handles nested objects and strings containing brackets', () => {
    const input = '[{"name":"[bracket] in string","nested":{"k":"v"}}] rest';
    expect(extractBalancedJson(input)).toBe('[{"name":"[bracket] in string","nested":{"k":"v"}}]');
  });

  it('returns null when JSON is never balanced', () => {
    expect(extractBalancedJson('[1,2,3')).toBeNull();
  });

  it('returns null when input does not start with [ or {', () => {
    expect(extractBalancedJson('plain text')).toBeNull();
  });
});

describe('parsePlaceCardsBlock', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('extracts cards from a well-formed closed fence and strips the block', () => {
    const input = [
      'Here are two spots:',
      '```place_cards',
      '[{"place_id":"A","blurb":"Great","tags":["x"]}]',
      '```',
    ].join('\n');
    const { cleanContent, rawCards } = parsePlaceCardsBlock(input);
    expect(rawCards).toHaveLength(1);
    expect(rawCards[0].place_id).toBe('A');
    expect(cleanContent).toBe('Here are two spots:');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('recovers cards from an open fence with balanced JSON (stream truncated)', () => {
    const truncated = 'Intro prose.\n```place_cards\n[{"place_id":"A","blurb":"B"}]';
    const { cleanContent, rawCards } = parsePlaceCardsBlock(truncated);
    expect(rawCards).toHaveLength(1);
    expect(rawCards[0].place_id).toBe('A');
    expect(cleanContent).toBe('Intro prose.');
  });

  it('accepts the singular `place_card` alias', () => {
    const input = '```place_card\n[{"place_id":"A"}]\n```';
    const { rawCards } = parsePlaceCardsBlock(input);
    expect(rawCards).toHaveLength(1);
    expect(rawCards[0].place_id).toBe('A');
  });

  it('logs a warning and returns no cards on malformed JSON inside a closed fence', () => {
    const input = '```place_cards\n[{oops}]\n```';
    const { rawCards, cleanContent } = parsePlaceCardsBlock(input);
    expect(rawCards).toEqual([]);
    // Block is still stripped even when parse fails.
    expect(cleanContent).toBe('');
    expect(warnSpy).toHaveBeenCalledWith(
      '[ai-chat] place_cards parse failed',
      expect.objectContaining({ jsonPreview: expect.any(String) }),
    );
  });

  it('returns content unchanged when no fence is present', () => {
    const input = 'Just a normal reply with no cards.';
    const { cleanContent, rawCards } = parsePlaceCardsBlock(input);
    expect(rawCards).toEqual([]);
    expect(cleanContent).toBe(input);
  });

  it('supports multiple cards in one block', () => {
    const input = '```place_cards\n[{"place_id":"A"},{"place_id":"B"},{"place_id":"C"}]\n```';
    const { rawCards } = parsePlaceCardsBlock(input);
    expect(rawCards.map(c => c.place_id)).toEqual(['A', 'B', 'C']);
  });

  it('wraps a single object payload in an array', () => {
    const input = '```place_cards\n{"place_id":"A"}\n```';
    const { rawCards } = parsePlaceCardsBlock(input);
    expect(rawCards).toHaveLength(1);
    expect(rawCards[0].place_id).toBe('A');
  });
});

describe('isDateInRange', () => {
  it('accepts dates inside the trip window', () => {
    expect(isDateInRange('2026-05-12', ARRIVAL, DEPARTURE)).toBe(true);
    expect(isDateInRange(ARRIVAL, ARRIVAL, DEPARTURE)).toBe(true);
    expect(isDateInRange(DEPARTURE, ARRIVAL, DEPARTURE)).toBe(true);
  });

  it('rejects dates outside the window', () => {
    expect(isDateInRange('2026-05-09', ARRIVAL, DEPARTURE)).toBe(false);
    expect(isDateInRange('2026-05-16', ARRIVAL, DEPARTURE)).toBe(false);
  });

  it('rejects malformed date strings', () => {
    expect(isDateInRange('May 12', ARRIVAL, DEPARTURE)).toBe(false);
    expect(isDateInRange('2026-5-12', ARRIVAL, DEPARTURE)).toBe(false);
  });

  it('is lenient when trip dates themselves are missing', () => {
    expect(isDateInRange('2026-05-12', '', '')).toBe(true);
  });
});

describe('isValidTime', () => {
  it('accepts HH:mm', () => {
    expect(isValidTime('09:30')).toBe(true);
    expect(isValidTime('23:59')).toBe(true);
  });

  it('rejects malformed or wrong-type inputs', () => {
    expect(isValidTime('9:30')).toBe(false);
    expect(isValidTime('0930')).toBe(false);
    expect(isValidTime(undefined)).toBe(false);
    expect(isValidTime(1230)).toBe(false);
  });
});

describe('buildSuggestedAdd', () => {
  const place = makePlace({ place_id: 'A', name: 'Carbone', phone: '+33 1 23', website: 'https://carbone.example' });

  it('returns undefined when raw is missing or has no date', () => {
    expect(buildSuggestedAdd(undefined, place, undefined, ARRIVAL, DEPARTURE)).toBeUndefined();
    expect(buildSuggestedAdd({}, place, undefined, ARRIVAL, DEPARTURE)).toBeUndefined();
  });

  it('returns undefined when the date is outside the trip window', () => {
    expect(
      buildSuggestedAdd({ itemType: 'reservation', date: '2026-05-16', time: '19:00' }, place, undefined, ARRIVAL, DEPARTURE),
    ).toBeUndefined();
  });

  it('builds a reservation with time + booking URL fallback to website', () => {
    const out = buildSuggestedAdd(
      { itemType: 'reservation', date: '2026-05-12', time: '19:30', party_size: 2, notes: 'Quiet corner' },
      place,
      undefined,
      ARRIVAL,
      DEPARTURE,
    );
    expect(out).toEqual({
      itemType: 'reservation',
      fields: expect.objectContaining({
        restaurant_name: 'Carbone',
        date: '2026-05-12',
        time: '19:30',
        party_size: 2,
        address: place.formatted_address,
        phone: place.phone,
        website: place.website,
        notes: 'Quiet corner',
      }),
    });
  });

  it('returns undefined for reservation without a valid time', () => {
    expect(
      buildSuggestedAdd({ itemType: 'reservation', date: '2026-05-12' }, place, undefined, ARRIVAL, DEPARTURE),
    ).toBeUndefined();
  });

  it('builds an activity and preserves end_time when valid', () => {
    const out = buildSuggestedAdd(
      { itemType: 'activity', date: '2026-05-12', time: '09:00', end_time: '11:30' },
      place,
      undefined,
      ARRIVAL,
      DEPARTURE,
    );
    expect(out?.itemType).toBe('activity');
    expect(out?.fields.start_time).toBe('09:00');
    expect(out?.fields.end_time).toBe('11:30');
  });

  it('prefers verified booking_url over the place website', () => {
    const out = buildSuggestedAdd(
      { itemType: 'reservation', date: '2026-05-12', time: '19:30' },
      place,
      'https://resy.com/cities/ny/venues/carbone',
      ARRIVAL,
      DEPARTURE,
    );
    expect(out?.fields.website).toBe('https://resy.com/cities/ny/venues/carbone');
  });

  describe('accommodation', () => {
    const hotel = makePlace({
      place_id: 'H1',
      name: 'Hotel de Crillon',
      phone: '+33 1 44',
      website: 'https://crillon.example',
    });

    it('builds an accommodation with check-in/out dates inside the trip window', () => {
      const out = buildSuggestedAdd(
        {
          itemType: 'accommodation',
          check_in_date: '2026-05-11',
          check_out_date: '2026-05-14',
          check_in_time: '15:00',
          check_out_time: '11:00',
          notes: 'Deluxe suite',
        },
        hotel,
        undefined,
        ARRIVAL,
        DEPARTURE,
      );
      expect(out?.itemType).toBe('accommodation');
      expect(out?.fields).toEqual(expect.objectContaining({
        name: 'Hotel de Crillon',
        check_in_date: '2026-05-11',
        check_out_date: '2026-05-14',
        check_in_time: '15:00',
        check_out_time: '11:00',
        address: hotel.formatted_address,
        phone: hotel.phone,
        website: hotel.website,
        place_id: 'H1',
        notes: 'Deluxe suite',
      }));
    });

    it('allows check-in and check-out on the trip boundaries', () => {
      const out = buildSuggestedAdd(
        { itemType: 'accommodation', check_in_date: ARRIVAL, check_out_date: DEPARTURE },
        hotel,
        undefined,
        ARRIVAL,
        DEPARTURE,
      );
      expect(out?.itemType).toBe('accommodation');
      expect(out?.fields.check_in_date).toBe(ARRIVAL);
      expect(out?.fields.check_out_date).toBe(DEPARTURE);
    });

    it('returns undefined when a date is outside the trip window', () => {
      expect(
        buildSuggestedAdd(
          { itemType: 'accommodation', check_in_date: '2026-05-09', check_out_date: '2026-05-14' },
          hotel, undefined, ARRIVAL, DEPARTURE,
        ),
      ).toBeUndefined();
      expect(
        buildSuggestedAdd(
          { itemType: 'accommodation', check_in_date: '2026-05-11', check_out_date: '2026-05-16' },
          hotel, undefined, ARRIVAL, DEPARTURE,
        ),
      ).toBeUndefined();
    });

    it('returns undefined when check-out is not strictly after check-in', () => {
      expect(
        buildSuggestedAdd(
          { itemType: 'accommodation', check_in_date: '2026-05-12', check_out_date: '2026-05-12' },
          hotel, undefined, ARRIVAL, DEPARTURE,
        ),
      ).toBeUndefined();
      expect(
        buildSuggestedAdd(
          { itemType: 'accommodation', check_in_date: '2026-05-13', check_out_date: '2026-05-12' },
          hotel, undefined, ARRIVAL, DEPARTURE,
        ),
      ).toBeUndefined();
    });

    it('returns undefined when dates are missing or malformed', () => {
      expect(
        buildSuggestedAdd(
          { itemType: 'accommodation', check_in_date: '2026-05-12' },
          hotel, undefined, ARRIVAL, DEPARTURE,
        ),
      ).toBeUndefined();
      expect(
        buildSuggestedAdd(
          { itemType: 'accommodation', check_in_date: 'May 12', check_out_date: '2026-05-14' },
          hotel, undefined, ARRIVAL, DEPARTURE,
        ),
      ).toBeUndefined();
    });

    it('drops invalid time fields without rejecting the whole card', () => {
      const out = buildSuggestedAdd(
        {
          itemType: 'accommodation',
          check_in_date: '2026-05-11',
          check_out_date: '2026-05-14',
          check_in_time: '3pm',
          check_out_time: '1100',
        },
        hotel, undefined, ARRIVAL, DEPARTURE,
      );
      expect(out?.itemType).toBe('accommodation');
      expect(out?.fields.check_in_time).toBeUndefined();
      expect(out?.fields.check_out_time).toBeUndefined();
    });

    it('prefers verified booking_url over the hotel website', () => {
      const out = buildSuggestedAdd(
        {
          itemType: 'accommodation',
          check_in_date: '2026-05-11',
          check_out_date: '2026-05-14',
        },
        hotel,
        'https://booking.example/crillon',
        ARRIVAL, DEPARTURE,
      );
      expect(out?.fields.website).toBe('https://booking.example/crillon');
    });
  });
});

describe('enrichPlaceCards', () => {
  const placeA = makePlace({ place_id: 'A', name: 'Carbone', photo_reference: 'photo-a', rating: 4.7 });
  const placeB = makePlace({ place_id: 'B', name: 'Le Gigi' });

  function places(): Map<string, PlaceResult> {
    return new Map<string, PlaceResult>([
      ['A', placeA],
      ['B', placeB],
    ]);
  }

  it('drops cards missing place_id', () => {
    const raw: RawPlaceCard[] = [{ blurb: 'oops no id' }];
    const { cards, drops } = enrichPlaceCards(raw, places(), new Set(), SUPABASE_URL, ARRIVAL, DEPARTURE);
    expect(cards).toEqual([]);
    expect(drops).toEqual([{ index: 0, reason: 'missing_place_id' }]);
  });

  it('drops cards whose place_id is not in the tool-result map', () => {
    const raw: RawPlaceCard[] = [{ place_id: 'ZZZ', blurb: 'hallucinated' }];
    const { cards, drops } = enrichPlaceCards(raw, places(), new Set(), SUPABASE_URL, ARRIVAL, DEPARTURE);
    expect(cards).toEqual([]);
    expect(drops).toEqual([{ index: 0, reason: 'place_not_in_map' }]);
  });

  it('keeps the card but flags an unverified booking_url drop', () => {
    const raw: RawPlaceCard[] = [{ place_id: 'A', booking_url: 'https://fake.example/book' }];
    const { cards, drops } = enrichPlaceCards(raw, places(), new Set(), SUPABASE_URL, ARRIVAL, DEPARTURE);
    expect(cards).toHaveLength(1);
    expect(cards[0].booking_url).toBeUndefined();
    expect(drops).toEqual([{ index: 0, reason: 'unverified_booking_url_kept_card' }]);
  });

  it('keeps a verified booking_url on the card', () => {
    const verified = new Set(['https://resy.com/venue']);
    const raw: RawPlaceCard[] = [{ place_id: 'A', booking_url: 'https://resy.com/venue' }];
    const { cards, drops } = enrichPlaceCards(raw, places(), verified, SUPABASE_URL, ARRIVAL, DEPARTURE);
    expect(cards[0].booking_url).toBe('https://resy.com/venue');
    expect(drops).toEqual([]);
  });

  it('drops invalid suggested_add (date out of range) but keeps the card', () => {
    const raw: RawPlaceCard[] = [{
      place_id: 'A',
      suggested_add: { itemType: 'reservation', date: '2026-05-20', time: '19:00' },
    }];
    const { cards, drops } = enrichPlaceCards(raw, places(), new Set(), SUPABASE_URL, ARRIVAL, DEPARTURE);
    expect(cards).toHaveLength(1);
    expect(cards[0].suggested_add).toBeUndefined();
    expect(drops).toEqual([{ index: 0, reason: 'suggested_add_invalid' }]);
  });

  it('builds a photo_url from photo_reference via the places proxy', () => {
    const raw: RawPlaceCard[] = [{ place_id: 'A' }];
    const { cards } = enrichPlaceCards(raw, places(), new Set(), SUPABASE_URL, ARRIVAL, DEPARTURE);
    expect(cards[0].photo_url).toContain('google-places-proxy?photo_reference=photo-a');
  });

  it('truncates blurb to 240 chars and slices tags to 4', () => {
    const longBlurb = 'x'.repeat(500);
    const raw: RawPlaceCard[] = [{
      place_id: 'A',
      blurb: longBlurb,
      tags: ['a', 'b', 'c', 'd', 'e', 'f'],
    }];
    const { cards } = enrichPlaceCards(raw, places(), new Set(), SUPABASE_URL, ARRIVAL, DEPARTURE);
    expect(cards[0].blurb).toHaveLength(240);
    expect(cards[0].tags).toEqual(['a', 'b', 'c', 'd']);
  });

  it('filters non-string tags out before slicing', () => {
    const raw: RawPlaceCard[] = [{ place_id: 'A', tags: ['ok', 42, null, 'also-ok'] as unknown[] as string[] }];
    const { cards } = enrichPlaceCards(raw, places(), new Set(), SUPABASE_URL, ARRIVAL, DEPARTURE);
    expect(cards[0].tags).toEqual(['ok', 'also-ok']);
  });

  it('handles a mix of kept and dropped cards in one batch', () => {
    const raw: RawPlaceCard[] = [
      { place_id: 'A', blurb: 'kept' },
      { blurb: 'no id' },
      { place_id: 'ZZZ', blurb: 'not in map' },
      { place_id: 'B', blurb: 'also kept' },
    ];
    const { cards, drops } = enrichPlaceCards(raw, places(), new Set(), SUPABASE_URL, ARRIVAL, DEPARTURE);
    expect(cards.map(c => c.place_id)).toEqual(['A', 'B']);
    expect(drops).toEqual([
      { index: 1, reason: 'missing_place_id' },
      { index: 2, reason: 'place_not_in_map' },
    ]);
  });
});

describe('malformed payload hardening', () => {
  it('wraps a scalar JSON payload and lets enrichment drop it', () => {
    const { rawCards } = parsePlaceCardsBlock('```place_cards\n"just a string"\n```');
    // parsePlaceCardsBlock wraps any non-array parse result.
    expect(rawCards).toEqual(['just a string']);
    const { cards, drops } = enrichPlaceCards(
      rawCards as unknown as RawPlaceCard[], new Map(), new Set(), 'https://x.supabase.co', '2026-09-14', '2026-09-17',
    );
    expect(cards).toEqual([]);
    expect(drops).toEqual([{ index: 0, reason: 'missing_place_id' }]);
  });

  it('drops null entries without throwing', () => {
    const { rawCards } = parsePlaceCardsBlock('```place_cards\nnull\n```');
    expect(rawCards).toEqual([null]);
    const { cards, drops } = enrichPlaceCards(
      rawCards as unknown as RawPlaceCard[], new Map(), new Set(), 'https://x.supabase.co', '2026-09-14', '2026-09-17',
    );
    expect(cards).toEqual([]);
    expect(drops).toEqual([{ index: 0, reason: 'missing_place_id' }]);
  });

  it('drops scalar entries inside an array payload without throwing', () => {
    const { rawCards } = parsePlaceCardsBlock('```place_cards\n[1, null, "x"]\n```');
    expect(rawCards).toHaveLength(3);
    const { cards, drops } = enrichPlaceCards(
      rawCards as unknown as RawPlaceCard[], new Map(), new Set(), 'https://x.supabase.co', '2026-09-14', '2026-09-17',
    );
    expect(cards).toEqual([]);
    expect(drops).toHaveLength(3);
    expect(drops.every((d) => d.reason === 'missing_place_id')).toBe(true);
  });
});
