import { describe, expect, it } from 'vitest';
import { stripCreateItemsForDisplay } from '../components/trip/ai-assistant/chatContentSanitizer';

const ITEM_JSON =
  '[{"itemType": "transportation", "fields": {"type": "car_service", ' +
  '"departure_location": "Awendaw, SC", "arrival_location": "Washington, DC", ' +
  '"departure_date": "2026-08-30"}}]';
const PROSE = "I've added a 4-hour drive from Awendaw, SC to Washington D.C.";

describe('stripCreateItemsForDisplay — final content', () => {
  it('returns unrelated content unchanged', () => {
    const input = 'Here are three dinner spots in Montmartre.';
    expect(stripCreateItemsForDisplay(input)).toBe(input);
  });

  it('strips a closed fenced block', () => {
    const input = `${PROSE}\n\n\`\`\`create_items\n${ITEM_JSON}\n\`\`\``;
    expect(stripCreateItemsForDisplay(input)).toBe(PROSE);
  });

  it('strips an open (unclosed) fence to the end', () => {
    const input = `${PROSE}\n\`\`\`create_items\n[{"itemType": "act`;
    expect(stripCreateItemsForDisplay(input)).toBe(PROSE);
  });

  it('strips a bare block leaked into a persisted message (production repro)', () => {
    const input = `create_items ${ITEM_JSON} ${PROSE}`;
    const out = stripCreateItemsForDisplay(input);
    expect(out).toBe(PROSE);
    expect(out).not.toContain('itemType');
  });

  it('strips a bare block that follows the prose', () => {
    const input = `${PROSE}\n\ncreate_items ${ITEM_JSON}`;
    expect(stripCreateItemsForDisplay(input)).toBe(PROSE);
  });

  it('leaves bare JSON that is not create-item shaped', () => {
    const input = 'Counts: create_items [1, 2, 3] as requested.';
    expect(stripCreateItemsForDisplay(input)).toBe(input);
  });

  it('leaves a bare marker whose JSON never balances (final content)', () => {
    const input = 'create_items [{"itemType": "activity", "fields": {"name": "Mus';
    expect(stripCreateItemsForDisplay(input)).toBe(input);
  });

  it('leaves prose that merely mentions create_items', () => {
    const input = 'The create_items block is how I add things.';
    expect(stripCreateItemsForDisplay(input)).toBe(input);
  });

  it('leaves inline-code mentions alone', () => {
    const input = 'Use `create_items` [docs] to add things.';
    expect(stripCreateItemsForDisplay(input)).toBe(input);
  });
});

describe('stripCreateItemsForDisplay — streaming', () => {
  const streaming = { streaming: true };

  it('hides a partially typed fence marker', () => {
    expect(stripCreateItemsForDisplay('Adding it now. ```create_it', streaming)).toBe(
      'Adding it now.'
    );
  });

  it('hides an open fence while its JSON streams in', () => {
    const input = 'Adding it now.\n```create_items\n[{"itemType": "transp';
    expect(stripCreateItemsForDisplay(input, streaming)).toBe('Adding it now.');
  });

  it('truncates at a bare marker while its JSON streams in', () => {
    const input = `${PROSE} create_items [{"itemType": "transp`;
    expect(stripCreateItemsForDisplay(input, streaming)).toBe(PROSE);
  });

  it('holds back a fully typed bare marker awaiting its JSON', () => {
    expect(stripCreateItemsForDisplay('Adding it now. create_items ', streaming)).toBe(
      'Adding it now.'
    );
  });

  it('holds back a partial bare marker at the tail', () => {
    expect(stripCreateItemsForDisplay("I'll add that. create_i", streaming)).toBe(
      "I'll add that."
    );
  });

  it('does not eat words that merely end like the marker prefix', () => {
    const input = 'The plan: recreate';
    expect(stripCreateItemsForDisplay(input, streaming)).toBe(input);
  });

  it('strips a completed bare block mid-stream, keeping trailing prose', () => {
    const input = `create_items ${ITEM_JSON} ${PROSE}`;
    expect(stripCreateItemsForDisplay(input, streaming)).toBe(PROSE);
  });

  it('returns empty for a stream that is so far only a block', () => {
    expect(
      stripCreateItemsForDisplay(`\`\`\`create_items\n[{"itemType": "transp`, streaming)
    ).toBe('');
  });
});
