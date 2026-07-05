import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useTripReservations } from './useTripReservations';

const eqMock = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ select: () => ({ eq: eqMock }) }) },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client }, children);
}

describe('useTripReservations', () => {
  beforeEach(() => eqMock.mockReset());
  it('returns the trip reservations', async () => {
    eqMock.mockResolvedValue({ data: [{ id: 'r1', trip_id: 't1', restaurant_name: 'Septime' }], error: null });
    const { result } = renderHook(() => useTripReservations('t1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: 'r1', trip_id: 't1', restaurant_name: 'Septime' }]);
  });
});
