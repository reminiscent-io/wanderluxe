import { describe, it, expect } from 'vitest';
import { findSlop, repairCopy, SLOP_WORDS, TRAVEL_CLICHES, VOICE_RULES } from './voice';

const clean = (t: string) => findSlop(t).map((f) => f.rule);

describe('findSlop — banned vocabulary', () => {
  it('catches general slop words', () => {
    expect(clean('A transformative week that will elevate your senses.')).toEqual([
      'banned word',
      'banned word',
    ]);
  });

  it('catches travel clichés', () => {
    expect(clean('A hidden gem nestled above the bustling harbour.')).toHaveLength(3);
  });

  it('passes plain, specific copy', () => {
    expect(clean('Dinner at Kiki\'s, up the hill from the old port.')).toEqual([]);
    expect(clean('The 7:40 ferry to Naxos, then nothing until lunch.')).toEqual([]);
  });

  it('reports what it matched so the log names the word', () => {
    expect(findSlop('An unforgettable evening.')).toEqual([
      { rule: 'banned word', match: 'unforgettable' },
    ]);
  });
});

describe('findSlop — proper nouns are not slop', () => {
  it('leaves capitalized place and venue names alone', () => {
    expect(clean('Drinks at the Beacon, then Foster City by train.')).toEqual([]);
    expect(clean('Athens · Elevate Lounge · Vibrant Coffee Roasters')).toEqual([]);
  });

  it('still catches the same word used as slop', () => {
    expect(clean('A beacon of island calm.')).toEqual(['banned word']);
  });

  it('catches a banned word that opens a sentence', () => {
    expect(clean('Delve into the old town.')).toEqual(['banned word']);
    expect(clean('Lunch on the terrace. Vibrant markets after.')).toEqual(['banned word']);
  });
});

describe('findSlop — sentence shapes', () => {
  it.each([
    ['This is not just a trip, but a way of seeing.', 'binary contrast'],
    ['The question isn\'t where to eat, it is when.', 'binary contrast'],
    ['Here\'s the thing about Crete: go slowly.', 'throat-clearing'],
    ['What most people miss is the north coast.', 'faux insight'],
    ['Three days of walking, showcasing the island\'s range.', 'superficial analysis'],
    ['A testament to the city\'s long afternoons.', 'importance puffery'],
    ['When it comes to dinner, book ahead.', 'empty phrase'],
    ['Widely regarded as the best swim on the island.', 'weasel attribution'],
    ['In conclusion, a week well spent.', 'summary recap'],
  ])('flags %j', (text, rule) => {
    expect(clean(text)).toContain(rule);
  });

  it('does not flag an ordinary colon caption', () => {
    expect(clean('Athens: the museum, then the hill at dusk.')).toEqual([]);
  });
});

describe('repairCopy', () => {
  it('turns clause em dashes into commas', () => {
    expect(repairCopy('Ten Days — Aegean Light')).toBe('Ten Days, Aegean Light');
  });

  it('does not double up punctuation', () => {
    expect(repairCopy('Slow mornings, — long lunches')).toBe('Slow mornings, long lunches');
  });

  it('drops a trailing dash rather than leaving a hanging comma', () => {
    expect(repairCopy('Salt air, white stone —')).toBe('Salt air, white stone');
  });

  it('leaves en dashes and hyphens in ranges alone', () => {
    expect(repairCopy('June 1–5, the off-season')).toBe('June 1–5, the off-season');
  });

  it('leaves clean copy untouched', () => {
    const t = 'Dinner at 8 in Plaka.';
    expect(repairCopy(t)).toBe(t);
  });
});

describe('VOICE_RULES', () => {
  it('tells the model every word the checker will reject', () => {
    for (const w of [...SLOP_WORDS, ...TRAVEL_CLICHES]) {
      expect(VOICE_RULES).toContain(w);
    }
  });
});

describe('repairCopy — a dash never becomes a comma splice', () => {
  it('closes a sentence when the dash joined two of them', () => {
    expect(repairCopy('Hold onto these details — this December was full of small, good things.')).toBe(
      'Hold onto these details. This December was full of small, good things.'
    );
    expect(repairCopy('Land at noon — we drive straight to the coast.')).toBe('Land at noon. We drive straight to the coast.');
  });

  it('sets off an aside with commas', () => {
    expect(repairCopy('We land at noon — just in time for lunch — and drive north.')).toBe(
      'We land at noon, just in time for lunch, and drive north.'
    );
  });

  it('keeps a phrase as a comma', () => {
    expect(repairCopy("Dinner at Kiki's — up the hill from the port")).toBe("Dinner at Kiki's, up the hill from the port");
  });

  it('does not leave a comma before the new sentence', () => {
    expect(repairCopy('Slow mornings, — this is the plan.')).toBe('Slow mornings. This is the plan.');
  });

  it('leaves a period the writer typed alone', () => {
    expect(repairCopy('Doors at 7.30 p.m. sharp')).toBe('Doors at 7.30 p.m. sharp');
  });
});

describe('findSlop — the holiday-card register', () => {
  it.each(['A winter wonderland on the North Shore.', 'Two days of holiday magic.', 'Making memories by the tree.'])(
    'flags %j',
    (text) => {
      expect(clean(text)).toContain('banned word');
    }
  );

  it('leaves a real event name alone', () => {
    expect(clean('The drive through the Magic of Lights at Jones Beach.')).toEqual([]);
  });
});
