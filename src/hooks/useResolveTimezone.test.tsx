import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useResolveTimezone } from './useResolveTimezone';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }),
    },
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('useResolveTimezone', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('does not fetch when placeId is null', async () => {
    const { result } = renderHook(() => useResolveTimezone(null), { wrapper });
    expect(result.current.timeZoneId).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('resolves a timezone id via timezone-proxy', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ timeZoneId: 'Europe/Paris' }),
    });
    const { result } = renderHook(() => useResolveTimezone('place-1'), { wrapper });
    await waitFor(() => expect(result.current.timeZoneId).toBe('Europe/Paris'));
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toContain('/functions/v1/timezone-proxy');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ placeId: 'place-1' });
  });

  it('soft-fails to null on a non-OK response', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, json: async () => ({}) });
    const { result } = renderHook(() => useResolveTimezone('place-2'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.timeZoneId).toBeNull();
  });

  it('soft-fails to null when fetch rejects', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useResolveTimezone('place-3'), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.timeZoneId).toBeNull();
  });
});
