import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MotifBand, MotifMark } from './motifs';
import { MOTIFS } from '@/lib/printDesign/spec';

describe('motifs', () => {
  it('registers the celebratory motifs', () => {
    expect(MOTIFS).toEqual(expect.arrayContaining(['confetti', 'dots', 'sunburst']));
  });

  it('draws every registered motif as a band and as a mark', () => {
    for (const motif of MOTIFS) {
      const band = render(<MotifBand motif={motif} />);
      const mark = render(<MotifMark motif={motif} />);
      if (motif === 'none') {
        expect(band.container.querySelector('svg')).toBeNull();
        expect(mark.container.firstChild).toBeNull();
      } else {
        expect(band.container.querySelector('pattern')).not.toBeNull();
        expect(mark.container.querySelector('svg')?.children.length ?? 0).toBeGreaterThan(0);
      }
      band.unmount();
      mark.unmount();
    }
  });
});
