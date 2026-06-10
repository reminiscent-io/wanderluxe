import { describe, it, expect } from 'vitest';
import { isOrphanedHeading } from './pagination';

describe('isOrphanedHeading', () => {
  it('breaks when a heading would be the last node on the page', () => {
    expect(isOrphanedHeading({ headlineLevel: 1 }, [])).toBe(true);
  });

  it('does not break when content follows the heading on the same page', () => {
    expect(isOrphanedHeading({ headlineLevel: 1 }, [{}])).toBe(false);
  });

  it('ignores non-heading nodes', () => {
    expect(isOrphanedHeading({}, [])).toBe(false);
    expect(isOrphanedHeading({ headlineLevel: 2 }, [])).toBe(false);
  });
});
