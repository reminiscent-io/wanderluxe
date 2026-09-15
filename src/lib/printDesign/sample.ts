// src/lib/printDesign/sample.ts — one fixed design, for showing a free user
// what the Studio does to their own trip.
//
// No model call, and deliberately no model prose: the cover carries the
// destination and nothing else, so the preview promises only what it shows.
// Every copy slot here is either empty or a value sanitizePrintDesign would
// have produced anyway, which is what lets the preview claim to be the real
// renderer (asserted in ./sample.test.ts).
//
// Dependency-free and DOM-free, like ./spec.ts.

import type { PrintDesignSpec } from './spec';

export const SAMPLE_TEASER_DESIGN: PrintDesignSpec = {
  themeName: 'Sample',
  themeRationale: '',
  palette: {
    primary: '#14505f',
    secondary: '#7a4a2e',
    background: '#f7f9fa',
    surface: '#eef3f5',
    ink: '#1f2a30',
    muted: '#566670',
    accent: '#2a7d8c',
  },
  fontPairing: 'editorial',
  motif: 'waves',
  cover: {
    // The sanitizer's own fallback title, so this spec round-trips unchanged.
    // teaserDesign() replaces it with the trip's destination.
    title: 'The Itinerary',
    subtitle: '',
    tagline: '',
  },
  intro: '',
  dayCaptions: {},
  // The sanitizer's fallback sign-off, for the same reason.
  closing: 'Safe travels.',
};

/** The sample design, titled with this trip's destination. */
export function teaserDesign(destination?: string): PrintDesignSpec {
  const title = destination?.trim();
  return {
    ...SAMPLE_TEASER_DESIGN,
    cover: {
      ...SAMPLE_TEASER_DESIGN.cover,
      title: title || SAMPLE_TEASER_DESIGN.cover.title,
    },
  };
}
