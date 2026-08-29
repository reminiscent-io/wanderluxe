import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  findBareCreateItems,
  hasCreateItemsMarker,
  parseCreateItemsBlock,
} from '../../supabase/functions/ai-chat/createItems';

// The exact drift observed in production (mobile screenshot, 2026-08-29):
// the model dropped the fences and emitted the marker + JSON as plain prose,
// so the raw block leaked into the chat bubble and no item was ever staged.
const BARE_TRANSPORT_JSON =
  '[{"itemType": "transportation", "fields": {"type": "car_service", ' +
  '"departure_location": "Awendaw, SC", "arrival_location": "Washington, DC", ' +
  '"departure_date": "2026-08-30", "departure_time": "19:00", ' +
  '"arrival_time": "23:00", "notes": "4-hour drive"}}]';
const BARE_PROSE =
  "I've added a 4-hour drive from Awendaw, SC to Washington D.C. on Sunday, " +
  'August 30, 2026, departing at 7:00 PM and arriving at 11:00 PM.';

describe('parseCreateItemsBlock — fenced paths', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('extracts items from a closed fence and strips the block', () => {
    const input = [
      "I've booked that for you.",
      '```create_items',
      '[{"itemType": "reservation", "fields": {"restaurant_name": "Carbone", "date": "2026-08-30", "time": "19:00"}}]',
      '```',
    ].join('\n');
    const { cleanContent, extractedItems } = parseCreateItemsBlock(input);
    expect(extractedItems).toHaveLength(1);
    expect(extractedItems[0].itemType).toBe('reservation');
    expect(extractedItems[0].fields.restaurant_name).toBe('Carbone');
    expect(extractedItems[0].missingRequired).toEqual([]);
    expect(cleanContent).toBe("I've booked that for you.");
  });

  it('recovers items from an open fence with balanced JSON (stream truncated)', () => {
    const input = 'Adding it now.\n```create_items\n[{"itemType": "activity", "fields": {"name": "Museum", "date": "2026-08-30"}}]';
    const { cleanContent, extractedItems } = parseCreateItemsBlock(input);
    expect(extractedItems).toHaveLength(1);
    expect(extractedItems[0].itemType).toBe('activity');
    expect(cleanContent).toBe('Adding it now.');
  });

  it('leaves an open fence with unbalanced JSON untouched (existing behavior)', () => {
    const input = 'Adding it now.\n```create_items\n[{"itemType": "activity", "fields": {"name": "Mus';
    const { cleanContent, extractedItems } = parseCreateItemsBlock(input);
    expect(extractedItems).toHaveLength(0);
    expect(cleanContent).toBe(input);
  });

  it('strips a closed fence whose JSON fails to parse, yielding zero items', () => {
    const input = 'Done!\n```create_items\nnot json at all\n```';
    const { cleanContent, extractedItems } = parseCreateItemsBlock(input);
    expect(extractedItems).toHaveLength(0);
    expect(cleanContent).toBe('Done!');
    expect(errorSpy).toHaveBeenCalled();
  });

  it('computes missingRequired for incomplete items', () => {
    const input = '```create_items\n[{"itemType": "transportation", "fields": {"type": "flight"}}]\n```';
    const { extractedItems } = parseCreateItemsBlock(input);
    expect(extractedItems[0].missingRequired).toEqual([
      'departure_location',
      'arrival_location',
      'departure_date',
    ]);
  });
});

describe('parseCreateItemsBlock — bare (unfenced) recovery', () => {
  it('recovers the observed production drift: bare block before prose', () => {
    const input = `create_items ${BARE_TRANSPORT_JSON} ${BARE_PROSE}`;
    const { cleanContent, extractedItems } = parseCreateItemsBlock(input);
    expect(extractedItems).toHaveLength(1);
    expect(extractedItems[0].itemType).toBe('transportation');
    expect(extractedItems[0].fields).toEqual({
      type: 'car_service',
      departure_location: 'Awendaw, SC',
      arrival_location: 'Washington, DC',
      departure_date: '2026-08-30',
      departure_time: '19:00',
      arrival_time: '23:00',
      notes: '4-hour drive',
    });
    expect(extractedItems[0].missingRequired).toEqual([]);
    expect(cleanContent).toBe(BARE_PROSE);
    expect(cleanContent).not.toContain('create_items');
    expect(cleanContent).not.toContain('itemType');
  });

  it('recovers a bare block after prose', () => {
    const input = `${BARE_PROSE}\n\ncreate_items ${BARE_TRANSPORT_JSON}`;
    const { cleanContent, extractedItems } = parseCreateItemsBlock(input);
    expect(extractedItems).toHaveLength(1);
    expect(cleanContent).toBe(BARE_PROSE);
  });

  it('leaves prose mentioning create_items without JSON untouched', () => {
    const input = 'The create_items block is how I add things to your trip.';
    const { cleanContent, extractedItems } = parseCreateItemsBlock(input);
    expect(extractedItems).toHaveLength(0);
    expect(cleanContent).toBe(input);
  });

  it('rejects bare JSON that is not create-item shaped', () => {
    const input = 'Counts: create_items [1, 2, 3] as requested.';
    const { cleanContent, extractedItems } = parseCreateItemsBlock(input);
    expect(extractedItems).toHaveLength(0);
    expect(cleanContent).toBe(input);
  });

  it('rejects a bare marker whose JSON never balances', () => {
    const input = 'create_items [{"itemType": "activity", "fields": {"name": "Mus';
    const { cleanContent, extractedItems } = parseCreateItemsBlock(input);
    expect(extractedItems).toHaveLength(0);
    expect(cleanContent).toBe(input);
  });

  it('ignores an inline-code marker (backtick prefix fails the class)', () => {
    const input = 'Use `create_items` [docs] to add things.';
    const { cleanContent, extractedItems } = parseCreateItemsBlock(input);
    expect(extractedItems).toHaveLength(0);
    expect(cleanContent).toBe(input);
  });

  it('accepts a single bare object (not wrapped in an array)', () => {
    const input = 'create_items {"itemType": "activity", "fields": {"name": "Louvre", "date": "2026-08-30"}} Added!';
    const { cleanContent, extractedItems } = parseCreateItemsBlock(input);
    expect(extractedItems).toHaveLength(1);
    expect(extractedItems[0].fields.name).toBe('Louvre');
    expect(cleanContent).toBe('Added!');
  });
});

describe('findBareCreateItems', () => {
  it('reports the exact span to strip', () => {
    const input = `Sure. create_items ${BARE_TRANSPORT_JSON} Done.`;
    const found = findBareCreateItems(input);
    expect(found).not.toBeNull();
    expect(input.slice(0, found!.start)).toBe('Sure. ');
    expect(input.slice(found!.end)).toBe(' Done.');
    expect(found!.jsonStr).toBe(BARE_TRANSPORT_JSON);
  });

  it('returns null when there is no marker', () => {
    expect(findBareCreateItems('Nothing to see here [1,2]')).toBeNull();
  });
});

describe('hasCreateItemsMarker', () => {
  it('detects fenced markers', () => {
    expect(hasCreateItemsMarker('x\n```create_items\n[]')).toBe(true);
  });

  it('detects bare markers followed by JSON', () => {
    expect(hasCreateItemsMarker('create_items [{"a":1}]')).toBe(true);
  });

  it('is false for plain prose', () => {
    expect(hasCreateItemsMarker('I added the drive to your itinerary.')).toBe(false);
  });
});
