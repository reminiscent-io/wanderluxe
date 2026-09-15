// @vitest-environment node
//
// Locks the invariant documented at the top of the bold-layout block in
// printDocument.css: a fill is never used as a text colour. Text inside a
// bold-layout shape must use that shape's own on-fill colour (chosen by
// resolvePalette to clear 4.5:1 against the fill) — never a fill colour
// directly, which carries no contrast guarantee against itself.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const CSS_PATH = path.resolve(process.cwd(), 'src/components/trip/print-studio/printDocument.css');
// Comments are stripped first: the file's own header documents
// "data-layout='bold'" in prose, which would otherwise read as a selector
// and drag the unrelated base .print-doc rule that follows it into scope.
const css = fs.readFileSync(CSS_PATH, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

// On-fill text colours, plus 'inherit' (used by nested edit-affordance rules
// that just pick up whatever colour their containing panel already set).
const ALLOWED_VALUES = new Set([
  'var(--pd-on-fill-1)',
  'var(--pd-on-fill-2)',
  'var(--pd-on-fill-3)',
  'var(--pd-on-fill-4)',
  'var(--pd-day-on-fill)',
  'inherit',
]);

describe('bold layout sets text only in on-fill colours', () => {
  it('never uses a fill as a text colour outside the cover-band motif', () => {
    // Innermost {selector: body} blocks only — a wrapping @media rule never
    // matches this pattern on its own since its body contains nested braces.
    const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
    // "color:" as its own declaration name — never background-color,
    // border-*-color, etc. (those always have a non-word/hyphen character
    // immediately before "color", which the lookbehind excludes).
    const colorDeclRe = /(?<![\w-])color\s*:\s*([^;]+);?/g;

    let colorDeclarationsFound = 0;
    let ruleMatch: RegExpExecArray | null;
    while ((ruleMatch = ruleRe.exec(css)) !== null) {
      const [, rawSelector, body] = ruleMatch;
      if (!rawSelector.includes("data-layout='bold'")) continue;

      const isCoverBandMotif = rawSelector.includes('.pd-cover-band');

      colorDeclRe.lastIndex = 0;
      let declMatch: RegExpExecArray | null;
      while ((declMatch = colorDeclRe.exec(body)) !== null) {
        const value = declMatch[1].trim();
        colorDeclarationsFound += 1;

        const allowed = ALLOWED_VALUES.has(value) || (isCoverBandMotif && value === 'var(--pd-fill-2)');
        expect(
          allowed,
          `selector "${rawSelector.trim()}" sets color: ${value}, which is not an on-fill colour` +
            (isCoverBandMotif ? '' : ' (only the decorative .pd-cover-band motif may use a bare fill colour)')
        ).toBe(true);
      }
    }

    // A test that silently matched nothing would pass no matter what the
    // stylesheet said, so pin down that the scan actually found rules.
    expect(colorDeclarationsFound).toBeGreaterThanOrEqual(5);
  });
});
