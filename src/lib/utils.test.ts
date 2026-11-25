import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('keeps a custom text size next to a text colour', () => {
    expect(cn('text-ui-md font-medium', 'text-foreground')).toBe('text-ui-md font-medium text-foreground');
    expect(cn('text-ui-sm', 'text-earth-500')).toBe('text-ui-sm text-earth-500');
  });

  it('lets a later size replace an earlier one', () => {
    expect(cn('text-sm', 'text-ui-xs')).toBe('text-ui-xs');
    expect(cn('text-ui-md', 'text-ui-sm')).toBe('text-ui-sm');
  });
});
