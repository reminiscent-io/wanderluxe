import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useCalendarFeed } from './useCalendarFeed';

const single = vi.fn();
const updateEq = vi.fn().mockResolvedValue({ error: null });
const updateFn = vi.fn(() => ({ eq: updateEq }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: single }) }), update: updateFn }) },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client }, children);
}

describe('useCalendarFeed', () => {
  beforeEach(() => { single.mockReset(); updateFn.mockClear(); updateEq.mockClear(); });

  it('exposes a subscribe url when enabled with a token', async () => {
    single.mockResolvedValue({ data: { calendar_feed_enabled: true, calendar_feed_token: 'tok123' }, error: null });
    const { result } = renderHook(() => useCalendarFeed('t1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.enabled).toBe(true);
    expect(result.current.subscribeUrl).toContain('/api/trips/t1/calendar.ics?token=tok123');
    expect(result.current.subscribeUrl?.startsWith('webcal://')).toBe(true);
  });

  it('provisions a token on enable', async () => {
    single.mockResolvedValue({ data: { calendar_feed_enabled: false, calendar_feed_token: null }, error: null });
    const { result } = renderHook(() => useCalendarFeed('t1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => { await result.current.enable(); });
    expect(updateFn).toHaveBeenCalledTimes(1);
    const payload = updateFn.mock.calls[0][0];
    expect(payload.calendar_feed_enabled).toBe(true);
    expect(typeof payload.calendar_feed_token).toBe('string');
    expect(payload.calendar_feed_token.length).toBeGreaterThan(10);
  });

  it('regenerates a different token on reset (revocation guarantee)', async () => {
    single.mockResolvedValue({ data: { calendar_feed_enabled: true, calendar_feed_token: 'old-token' }, error: null });
    const { result } = renderHook(() => useCalendarFeed('t1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => { await result.current.reset(); });
    expect(updateFn).toHaveBeenCalledTimes(1);
    const payload = updateFn.mock.calls[0][0];
    expect(payload.calendar_feed_enabled).toBe(true);
    expect(typeof payload.calendar_feed_token).toBe('string');
    expect(payload.calendar_feed_token).not.toBe('old-token');
    expect(payload.calendar_feed_token.length).toBeGreaterThan(10);
  });

  it('disables the feed without clearing the token', async () => {
    single.mockResolvedValue({ data: { calendar_feed_enabled: true, calendar_feed_token: 'tok' }, error: null });
    const { result } = renderHook(() => useCalendarFeed('t1'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => { await result.current.disable(); });
    expect(updateFn).toHaveBeenCalledTimes(1);
    const payload = updateFn.mock.calls[0][0];
    expect(payload.calendar_feed_enabled).toBe(false);
    expect('calendar_feed_token' in payload).toBe(false);
  });
});
