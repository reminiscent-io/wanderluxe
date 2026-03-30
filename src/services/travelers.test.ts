import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the supabase client before importing the module
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      match: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
}));

import {
  listTravelers,
  upsertTraveler,
  deleteTraveler,
  getJunctionTravelerIds,
  setJunctionTravelers,
} from './travelers';
import { supabase } from '@/integrations/supabase/client';

describe('travelers service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listTravelers', () => {
    it('should fetch travelers for a trip and normalize permissions', async () => {
      const mockTravelers = [
        {
          id: '1',
          trip_id: 'trip-1',
          first_name: 'John',
          last_name: 'Doe',
          shared_by_user_id: 'user-1',
          shared_with_user_id: 'user-1',
          permission_level: 'EDIT', // Test case normalization
        },
        {
          id: '2',
          trip_id: 'trip-1',
          first_name: 'Jane',
          last_name: 'Smith',
          shared_by_user_id: 'user-1',
          shared_with_user_id: 'user-2',
          permission_level: 'read',
        },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
        order: vi.fn().mockResolvedValue({ data: mockTravelers, error: null }),
      } as any);

      const result = await listTravelers('trip-1');

      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(2);

      // Check permission normalization
      expect(result.data?.[0]?.permission_level).toBe('edit');
      expect(result.data?.[1]?.permission_level).toBe('read');

      // Check owner detection
      expect(result.data?.[0]?.is_owner).toBe(true);
      expect(result.data?.[1]?.is_owner).toBe(false);
    });

    it('should return empty array on error', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
      } as any);

      const result = await listTravelers('trip-1');

      expect(result.data).toEqual([]);
      expect(result.error).toBeTruthy();
    });
  });

  describe('upsertTraveler', () => {
    it('should upsert a traveler with normalized permission', async () => {
      const mockResponse = {
        data: {
          id: 'new-traveler-id',
          trip_id: 'trip-1',
          first_name: 'New',
          last_name: 'Traveler',
          permission_level: 'edit',
        },
        error: null,
      };

      vi.mocked(supabase.from).mockReturnValue({
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockResponse),
      } as any);

      const result = await upsertTraveler('trip-1', {
        first_name: 'New',
        last_name: 'Traveler',
        permission_level: 'edit',
      });

      expect(result.data).toBeTruthy();
      expect(supabase.from).toHaveBeenCalledWith('trip_shares');
    });

    it('should throw error if not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      await expect(
        upsertTraveler('trip-1', { first_name: 'Test' })
      ).rejects.toThrow('Not authenticated');
    });
  });

  describe('deleteTraveler', () => {
    it('should delete a traveler by id', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any);

      const result = await deleteTraveler('traveler-1');

      expect(result.error).toBeNull();
      expect(supabase.from).toHaveBeenCalledWith('trip_shares');
    });
  });

  describe('junction travelers (generic)', () => {
    it('should get accommodation traveler ids', async () => {
      const mockData = [
        { traveler_id: 't1' },
        { traveler_id: 't2' },
      ];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        match: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      } as any);

      const result = await getJunctionTravelerIds('accommodation', 'trip-1', 'stay-1');

      expect(result.data).toEqual(['t1', 't2']);
      expect(result.error).toBeNull();
    });

    it('should set accommodation travelers', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        match: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      } as any);

      const result = await setJunctionTravelers('accommodation', 'trip-1', 'stay-1', ['t1', 't2']);

      expect(result.error).toBeNull();
    });

    it('should handle empty traveler list', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        match: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any);

      const result = await setJunctionTravelers('accommodation', 'trip-1', 'stay-1', []);

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    it('should get transportation traveler ids', async () => {
      const mockData = [{ traveler_id: 't1' }];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        match: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      } as any);

      const result = await getJunctionTravelerIds('transportation', 'trip-1', 'transport-1');

      expect(result.data).toEqual(['t1']);
    });

    it('should get day activity traveler ids', async () => {
      const mockData = [{ traveler_id: 't1' }, { traveler_id: 't2' }];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        match: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      } as any);

      const result = await getJunctionTravelerIds('activity', 'trip-1', 'activity-1');

      expect(result.data).toEqual(['t1', 't2']);
    });

    it('should get reservation traveler ids', async () => {
      const mockData = [{ traveler_id: 't1' }];

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        match: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      } as any);

      const result = await getJunctionTravelerIds('reservation', 'trip-1', 'reservation-1');

      expect(result.data).toEqual(['t1']);
    });
  });
});

// Test the normalizePerm function behavior through listTravelers
describe('permission normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ['EDIT', 'edit'],
    ['Edit', 'edit'],
    ['edit', 'edit'],
    ['READ', 'read'],
    ['Read', 'read'],
    ['read', 'read'],
    ['view', 'read'],
    ['VIEW', 'read'],
    [null, 'read'],
    [undefined, 'read'],
    ['', 'read'],
    ['random', 'read'],
  ])('should normalize "%s" to "%s"', async (input, expected) => {
    const mockTraveler = {
      id: '1',
      trip_id: 'trip-1',
      first_name: 'Test',
      shared_by_user_id: 'user-1',
      shared_with_user_id: 'user-2',
      permission_level: input,
    };

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
      order: vi.fn().mockResolvedValue({ data: [mockTraveler], error: null }),
    } as any);

    const result = await listTravelers('trip-1');

    expect(result.data?.[0]?.permission_level).toBe(expected);
  });
});
