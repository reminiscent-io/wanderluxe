import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatToTime,
  generateDateArray,
  calculateDurationInDays,
  formatDateRange,
  formatNightsCount,
} from './dateUtils';

describe('dateUtils', () => {
  describe('formatDate', () => {
    it('should format a date string to display format', () => {
      expect(formatDate('2024-01-15')).toBe('Jan 15, 2024');
      expect(formatDate('2024-12-25')).toBe('Dec 25, 2024');
    });

    it('should return empty string for null or undefined', () => {
      expect(formatDate(null)).toBe('');
      expect(formatDate(undefined)).toBe('');
      expect(formatDate('')).toBe('');
    });

    it('should handle ISO date strings', () => {
      expect(formatDate('2024-06-15T10:30:00Z')).toBe('Jun 15, 2024');
    });
  });

  describe('formatToTime', () => {
    it('should format time string from HH:MM:SS to h:mm a', () => {
      expect(formatToTime('14:30:00')).toBe('2:30 PM');
      expect(formatToTime('09:00:00')).toBe('9:00 AM');
      expect(formatToTime('00:00:00')).toBe('12:00 AM');
      expect(formatToTime('12:00:00')).toBe('12:00 PM');
    });

    it('should return empty string for null or undefined', () => {
      expect(formatToTime(null)).toBe('');
      expect(formatToTime(undefined)).toBe('');
      expect(formatToTime('')).toBe('');
    });

    it('should return original string if parsing fails', () => {
      expect(formatToTime('invalid')).toBe('invalid');
    });
  });

  describe('generateDateArray', () => {
    it('should return array of dates between start and end (inclusive)', () => {
      const result = generateDateArray('2024-01-01', '2024-01-03');
      expect(result).toEqual(['2024-01-01', '2024-01-02', '2024-01-03']);
    });

    it('should return single date if start equals end', () => {
      const result = generateDateArray('2024-01-15', '2024-01-15');
      expect(result).toEqual(['2024-01-15']);
    });

    it('should handle month boundaries', () => {
      const result = generateDateArray('2024-01-30', '2024-02-02');
      expect(result).toEqual(['2024-01-30', '2024-01-31', '2024-02-01', '2024-02-02']);
    });

    it('should handle year boundaries', () => {
      const result = generateDateArray('2023-12-30', '2024-01-02');
      expect(result).toEqual(['2023-12-30', '2023-12-31', '2024-01-01', '2024-01-02']);
    });

    it('should return empty array for invalid dates', () => {
      expect(generateDateArray('invalid', '2024-01-01')).toEqual([]);
      expect(generateDateArray('2024-01-01', 'invalid')).toEqual([]);
    });

    it('should return empty array for empty strings', () => {
      expect(generateDateArray('', '2024-01-01')).toEqual([]);
      expect(generateDateArray('2024-01-01', '')).toEqual([]);
    });
  });

  describe('formatNightsCount', () => {
    it('should format nights count correctly', () => {
      expect(formatNightsCount('2024-01-01', '2024-01-04')).toBe('3 nights');
      expect(formatNightsCount('2024-01-01', '2024-01-02')).toBe('1 night');
    });
  });

  describe('calculateDurationInDays', () => {
    it('should calculate duration including both start and end days', () => {
      expect(calculateDurationInDays('2024-01-01', '2024-01-03')).toBe(3);
      expect(calculateDurationInDays('2024-01-01', '2024-01-01')).toBe(1);
    });

    it('should return 0 for missing dates', () => {
      expect(calculateDurationInDays(undefined, '2024-01-01')).toBe(0);
      expect(calculateDurationInDays('2024-01-01', undefined)).toBe(0);
      expect(calculateDurationInDays(undefined, undefined)).toBe(0);
    });

    it('should handle longer durations', () => {
      expect(calculateDurationInDays('2024-01-01', '2024-01-31')).toBe(31);
      expect(calculateDurationInDays('2024-01-01', '2024-12-31')).toBe(366); // 2024 is a leap year
    });
  });

  describe('formatDateRange', () => {
    it('should format date range in same month', () => {
      const result = formatDateRange('2024-01-01', '2024-01-15');
      expect(result).toBe('Jan 1 - 15, 2024');
    });

    it('should format date range spanning different months same year', () => {
      const result = formatDateRange('2024-01-15', '2024-02-20');
      expect(result).toBe('Jan 15 - Feb 20, 2024');
    });

    it('should format date range spanning different years', () => {
      const result = formatDateRange('2023-12-25', '2024-01-05');
      expect(result).toBe('Dec 25, 2023 - Jan 5, 2024');
    });

    it('should return empty string for null or undefined', () => {
      expect(formatDateRange(null, '2024-01-01')).toBe('');
      expect(formatDateRange('2024-01-01', null)).toBe('');
      expect(formatDateRange(null, null)).toBe('');
      expect(formatDateRange(undefined, undefined)).toBe('');
    });

    it('should return empty string for invalid dates', () => {
      expect(formatDateRange('invalid', '2024-01-01')).toBe('');
      expect(formatDateRange('2024-01-01', 'invalid')).toBe('');
    });
  });
});
