import { describe, expect, it } from 'vitest';
import { chooseForcedTool } from '../../supabase/functions/ai-chat/toolForcing';

describe('chooseForcedTool', () => {
  it('forces find_place for dining queries when both tools are available', () => {
    expect(chooseForcedTool('Give me dinner recommendations in Montmartre', true, true)).toBe('find_place');
    expect(chooseForcedTool('Best restaurants near my hotel?', true, true)).toBe('find_place');
  });

  it('forces search_web for explicit booking-link queries even when find_place is available', () => {
    expect(chooseForcedTool('Can you give me a booking link for Carbone?', true, true)).toBe('search_web');
    expect(chooseForcedTool('I need a reservation link for Le Gigi', true, true)).toBe('search_web');
  });

  it('forces search_web for weather queries', () => {
    expect(chooseForcedTool("What's the weather tomorrow in Paris?", true, true)).toBe('search_web');
    expect(chooseForcedTool('forecast for next week', true, true)).toBe('search_web');
  });

  it('forces search_web for current-info queries (news, events, opening hours)', () => {
    expect(chooseForcedTool('What events are happening today?', true, true)).toBe('search_web');
    expect(chooseForcedTool('Are any museums closed today?', true, true)).toBe('search_web');
    expect(chooseForcedTool('Latest exchange rate EUR to USD', true, true)).toBe('search_web');
  });

  it('forces find_place for attraction/activity recommendations', () => {
    expect(chooseForcedTool('Museums to visit in Paris', true, false)).toBe('find_place');
    expect(chooseForcedTool('Recommend some bars in the 11th', true, false)).toBe('find_place');
    expect(chooseForcedTool('things to do in Montmartre', true, true)).toBe('find_place');
  });

  it('falls back to search_web for dining queries when find_place is unavailable', () => {
    expect(chooseForcedTool('dinner recommendations', false, true)).toBe('search_web');
  });

  it('returns null when no tool is configured at all', () => {
    expect(chooseForcedTool('dinner in Paris', false, false)).toBeNull();
  });

  it('returns null for messages that are neither dining, place, booking, weather nor current-info', () => {
    // Note: "today" matches CURRENT_INFO_KEYWORDS by design, so keep queries truly neutral.
    expect(chooseForcedTool('hello there', true, true)).toBeNull();
    expect(chooseForcedTool('thanks!', true, true)).toBeNull();
  });

  it('prefers find_place for ambiguous dining+place queries (dining keywords win the structured path)', () => {
    expect(chooseForcedTool('good food places to visit', true, true)).toBe('find_place');
  });

  it('respects the find_place fallback when only find_place is available for place queries', () => {
    // Use exact keywords — the keyword regex is word-bounded so "landmarks"
    // won't match "landmark". That's intentional; this test documents it.
    expect(chooseForcedTool('any museum you recommend?', true, false)).toBe('find_place');
  });

  it('returns null when only search_web is configured and the message has no keywords', () => {
    expect(chooseForcedTool('hi there', false, true)).toBeNull();
  });
});
