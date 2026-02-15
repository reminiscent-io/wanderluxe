import { describe, it, expect } from 'vitest';
import {
  formatTransportationType,
  getTransportationIcon,
  getTransportationColor,
} from './transportationUtils';

describe('transportationUtils', () => {
  describe('formatTransportationType', () => {
    it('should format known transportation types correctly', () => {
      expect(formatTransportationType('flight')).toBe('Flight');
      expect(formatTransportationType('train')).toBe('Train');
      expect(formatTransportationType('car_service')).toBe('Car Service');
      expect(formatTransportationType('shuttle')).toBe('Shuttle');
      expect(formatTransportationType('ferry')).toBe('Ferry');
      expect(formatTransportationType('rental_car')).toBe('Rental Car');
    });

    it('should return "Unknown" for null or undefined', () => {
      expect(formatTransportationType(null)).toBe('Unknown');
      expect(formatTransportationType(undefined as any)).toBe('Unknown');
    });

    it('should format unknown types by capitalizing and replacing underscores', () => {
      expect(formatTransportationType('bus')).toBe('Bus');
      expect(formatTransportationType('private_jet')).toBe('Private Jet');
      expect(formatTransportationType('water_taxi')).toBe('Water Taxi');
    });

    it('should handle empty string', () => {
      expect(formatTransportationType('')).toBe('Unknown');
    });
  });

  describe('getTransportationIcon', () => {
    it('should return correct emoji for known transportation types', () => {
      expect(getTransportationIcon('flight')).toBe('✈️');
      expect(getTransportationIcon('train')).toBe('🚆');
      expect(getTransportationIcon('car_service')).toBe('🚗');
      expect(getTransportationIcon('shuttle')).toBe('🚐');
      expect(getTransportationIcon('ferry')).toBe('⛴️');
      expect(getTransportationIcon('rental_car')).toBe('🚙');
    });

    it('should return default bus emoji for null or undefined', () => {
      expect(getTransportationIcon(null)).toBe('🚌');
      expect(getTransportationIcon(undefined as any)).toBe('🚌');
    });

    it('should return default bus emoji for unknown types', () => {
      expect(getTransportationIcon('helicopter')).toBe('🚌');
      expect(getTransportationIcon('bicycle')).toBe('🚌');
    });

    it('should return default bus emoji for empty string', () => {
      expect(getTransportationIcon('')).toBe('🚌');
    });
  });

  describe('getTransportationColor', () => {
    it('should return correct color classes for known transportation types', () => {
      expect(getTransportationColor('flight')).toBe('bg-blue-100 text-blue-800');
      expect(getTransportationColor('train')).toBe('bg-green-100 text-green-800');
      expect(getTransportationColor('car_service')).toBe('bg-gray-100 text-gray-800');
      expect(getTransportationColor('shuttle')).toBe('bg-yellow-100 text-yellow-800');
      expect(getTransportationColor('ferry')).toBe('bg-cyan-100 text-cyan-800');
      expect(getTransportationColor('rental_car')).toBe('bg-purple-100 text-purple-800');
    });

    it('should return default gray color for null or undefined', () => {
      expect(getTransportationColor(null)).toBe('bg-gray-100 text-gray-800');
      expect(getTransportationColor(undefined as any)).toBe('bg-gray-100 text-gray-800');
    });

    it('should return default gray color for unknown types', () => {
      expect(getTransportationColor('helicopter')).toBe('bg-gray-100 text-gray-800');
      expect(getTransportationColor('unknown_type')).toBe('bg-gray-100 text-gray-800');
    });

    it('should return default gray color for empty string', () => {
      expect(getTransportationColor('')).toBe('bg-gray-100 text-gray-800');
    });
  });
});
