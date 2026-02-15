import { describe, it, expect } from 'vitest';
import { formatInternationalPhone } from './phoneUtils';

describe('phoneUtils', () => {
  describe('formatInternationalPhone', () => {
    it('should return international number when provided', () => {
      expect(formatInternationalPhone('+1 555-123-4567', '(555) 123-4567')).toBe('+1 555-123-4567');
      expect(formatInternationalPhone('+44 20 7946 0958', '020 7946 0958')).toBe('+44 20 7946 0958');
    });

    it('should return formatted number when international is not provided', () => {
      expect(formatInternationalPhone(null, '(555) 123-4567')).toBe('(555) 123-4567');
      expect(formatInternationalPhone(undefined, '020 7946 0958')).toBe('020 7946 0958');
    });

    it('should return empty string when both are null or undefined', () => {
      expect(formatInternationalPhone(null, null)).toBe('');
      expect(formatInternationalPhone(undefined, undefined)).toBe('');
      expect(formatInternationalPhone(null, undefined)).toBe('');
      expect(formatInternationalPhone(undefined, null)).toBe('');
    });

    it('should prefer international number over formatted number', () => {
      expect(formatInternationalPhone('+1 555-123-4567', '(555) 123-4567')).toBe('+1 555-123-4567');
    });

    it('should handle empty strings', () => {
      expect(formatInternationalPhone('', '(555) 123-4567')).toBe('(555) 123-4567');
      expect(formatInternationalPhone('', '')).toBe('');
      expect(formatInternationalPhone(null, '')).toBe('');
    });
  });
});
