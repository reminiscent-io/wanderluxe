// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { textToPdf } from './textToPdf';

describe('textToPdf', () => {
  it('produces a structurally plausible PDF', () => {
    const buf = textToPdf('Hello\nWorld');
    const s = buf.toString('latin1');
    expect(s.startsWith('%PDF-1.4')).toBe(true);
    expect(s).toContain('(Hello) Tj');
    expect(s).toContain('(World) Tj');
    expect(s.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(s).toContain('/BaseFont /Helvetica');
  });

  it('escapes parentheses and backslashes in text', () => {
    const s = textToPdf('Total (EUR): 100\\').toString('latin1');
    expect(s).toContain('(Total \\(EUR\\): 100\\\\) Tj');
  });

  it('preserves latin-1 accented characters and replaces others', () => {
    const s = textToPdf('Hôtel Le Meurice — Paris').toString('latin1');
    expect(s).toContain('Hôtel');
    // em-dash U+2014 is outside latin-1 → replaced with '-'
    expect(s).toContain('Le Meurice - Paris');
  });

  it('xref offsets point at the right objects', () => {
    const s = textToPdf('x').toString('latin1');
    const xref = s.slice(s.indexOf('xref'));
    const offsets = [...xref.matchAll(/^(\d{10}) 00000 n /gm)].map((m) => parseInt(m[1], 10));
    expect(offsets).toHaveLength(5);
    offsets.forEach((off, i) => {
      expect(s.slice(off, off + String(i + 1).length + 6)).toBe(`${i + 1} 0 obj`);
    });
  });
});
