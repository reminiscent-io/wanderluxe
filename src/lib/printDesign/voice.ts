// src/lib/printDesign/voice.ts — house voice for Print Studio editorial copy.
//
// The Print Studio model writes the words a traveler actually reads on a
// printed keepsake: cover title, tagline, intro, one caption per day, sign-off.
// Left alone, a model writes travel-brochure slop — "embark on an unforgettable
// journey through this vibrant tapestry" — which is worse than no copy at all
// on a page someone paid for and will keep.
//
// Two halves, deliberately in one file so they cannot drift apart:
//   VOICE_RULES  — the brief the model is given (see server/lib/printDesign.ts)
//   findSlop()   — the check applied to what it sends back (see spec.ts)
//
// The enforcement half only ever *removes*. It never rewrites a sentence into
// something the model did not say, and it never touches itinerary content —
// same contract as the rest of the spec module: a bad model day costs style,
// never facts.
//
// Dependency-free and DOM-free, like spec.ts.

/* =========================================================================
   The brief handed to the model
   ========================================================================= */

/** Words that are banned outright. Also enforced by findSlop(). */
export const SLOP_WORDS = [
  'delve',
  'foster',
  'leverage',
  'utilize',
  'facilitate',
  'empower',
  'streamline',
  'robust',
  'cutting-edge',
  'paradigm shift',
  'game changer',
  'tapestry',
  'realm',
  'beacon',
  'multifaceted',
  'meticulous',
  'meticulously',
  'intricate',
  'paramount',
  'transformative',
  'elevate',
  'elevates',
  'embark',
  'supercharge',
  'harness',
  'ever-evolving',
] as const;

/**
 * Travel-copy clichés. Not from the general slop list — these are the ones a
 * model reaches for specifically when it is asked to write about a place, and
 * they are what make an itinerary read like a brochure.
 */
export const TRAVEL_CLICHES = [
  'nestled',
  'hidden gem',
  'bustling',
  'breathtaking',
  'vibrant',
  'must-see',
  'must-visit',
  'iconic',
  'unforgettable',
  'journey of a lifetime',
  'feast for the senses',
  'a world away',
  'off the beaten path',
  'steeped in history',
  'culinary journey',
  'awaits',
] as const;

/**
 * The voice section of the system prompt. Kept next to the checks so a rule
 * can never be enforced without being asked for first — the model should be
 * told what good looks like, not silently marked down for it.
 */
export const VOICE_RULES = [
  'HOUSE VOICE. This is a keepsake someone paid for and will keep, so write like a sharp human editor rather than a brochure:',
  '- Be specific. Name the real place, dish, street, or time from the trip data. "Dinner at Kiki\'s, up the hill from the port" beats "an unforgettable culinary experience". A caption with no fact in it is worth less than no caption.',
  '- Write plain, active sentences. Let "is" and "has" do their work instead of reaching for a grander verb.',
  `- Never use these words: ${SLOP_WORDS.join(', ')}.`,
  `- Never use these travel clichés: ${TRAVEL_CLICHES.join(', ')}.`,
  '- No binary contrasts ("not just a trip, but a journey", "this isn\'t X, it\'s Y"). State the thing you mean.',
  '- No colon reveals ("The best part: the light at six"). Write it as a sentence.',
  '- No trailing -ing clauses that explain the significance ("..., showcasing the island\'s charm").',
  '- No importance puffery ("a testament to", "marks a pivotal moment", "plays a vital role").',
  '- No throat-clearing openers, no rhetorical questions, no "what most people miss".',
  '- The closing line is a sign-off, not a summary. Do not recap the trip and do not end on a grand metaphor.',
  '- Em dashes: none in the cover copy or captions, at most one in the intro, and only where a comma or full stop would genuinely read worse.',
  '- Copy that breaks these rules is dropped from the page rather than printed, so a plain true sentence always beats a decorative one.',
].join('\n');

/* =========================================================================
   The check applied to what comes back
   ========================================================================= */

export interface SlopFinding {
  /** Which rule tripped, for logging. */
  rule: string;
  /** The offending text, for logging. */
  match: string;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const WORD_RE = new RegExp(
  `\\b(?:${[...SLOP_WORDS, ...TRAVEL_CLICHES].map(escapeRe).join('|')})\\b`,
  'gi'
);

/**
 * Sentence-level patterns. Deliberately narrow: each one is a shape that
 * essentially only occurs in AI copy, so a false positive costs a real
 * sentence. Ambiguous patterns (colon reveals, fragmentation) are asked for in
 * VOICE_RULES but not enforced here — "Athens: the ancient heart" is a fine
 * caption, and no regex separates it from a fake dramatic reveal.
 */
const PATTERNS: Array<{ rule: string; re: RegExp }> = [
  { rule: 'binary contrast', re: /\bnot (just|only|merely)\b[^.!?]*\b(but|it'?s)\b/i },
  { rule: 'binary contrast', re: /\b(it'?s|this is|that'?s) not (a |an |the )?[^.!?]{1,40}[.,]\s*(it'?s|it is)\b/i },
  { rule: 'binary contrast', re: /\bthe (question|point) (isn'?t|is not)\b/i },
  { rule: 'throat-clearing', re: /^(here'?s (the thing|what)|let me be clear|i'?ll be honest|the (truth|reality) is)\b/i },
  { rule: 'faux insight', re: /\b(most people (skip|miss|get wrong)|what most people|nobody tells you|everyone misses)\b/i },
  { rule: 'superficial analysis', re: /,\s+(highlighting|underscoring|reflecting|showcasing|embodying|capturing the essence)\b/i },
  { rule: 'importance puffery', re: /\b(a testament to|stands as a testament|marks a pivotal|plays a (vital|key) role|solidif\w+ its|underscor\w+ (its|the) (significance|importance))\b/i },
  { rule: 'empty phrase', re: /\b(at the end of the day|in today'?s world|in the age of|when it comes to|at its core|let'?s dive in|it'?s worth noting|it'?s important to note)\b/i },
  { rule: 'weasel attribution', re: /\b(experts agree|studies show|widely regarded as|many would argue)\b/i },
  { rule: 'rhetorical setup', re: /\b(what if i told you|plot twist:|think about it:)/i },
  { rule: 'summary recap', re: /^(in conclusion|ultimately|overall|all in all|in summary)\b/i },
];

/**
 * A capitalized match mid-sentence is almost certainly a real name — Beacon
 * Hill, Foster City, the Elevate Lounge — not slop. A slop word used as slop
 * is lowercase. Matches at a sentence start are just sentence starts and stay
 * eligible.
 */
function looksLikeProperNoun(text: string, index: number, match: string): boolean {
  if (!/^[A-Z]/.test(match)) return false;
  const before = text.slice(0, index).trimEnd();
  // Only . ! ? start a new sentence. After a colon or a "·" route separator a
  // capitalized word is a name ("Athens · Elevate Lounge"), not a sentence.
  return before !== '' && !/[.!?]$/.test(before);
}

/** Every rule the text breaks. Empty array means it is clean. */
export function findSlop(text: string): SlopFinding[] {
  const findings: SlopFinding[] = [];

  WORD_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = WORD_RE.exec(text)) !== null) {
    if (!looksLikeProperNoun(text, m.index, m[0])) {
      findings.push({ rule: 'banned word', match: m[0] });
    }
  }

  for (const { rule, re } of PATTERNS) {
    const hit = re.exec(text);
    if (hit) findings.push({ rule, match: hit[0] });
  }

  return findings;
}

/**
 * Safe repairs — changes that cannot alter meaning, applied before the text is
 * judged. Only the em-dash rule qualifies: a dash between clauses is a rhythm
 * crutch, and a comma always carries the same sentence.
 */
export function repairCopy(text: string): string {
  return text
    .replace(/\s*—\s*/g, ', ')
    .replace(/([,;:])\s*,/g, '$1')
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/,\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}
