import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useAIAssistant } from './useAIAssistant';

const getSessionMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => getSessionMock(...args),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

vi.mock('@microsoft/fetch-event-source', () => ({ fetchEventSource: vi.fn() }));
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));

type FetchMock = ReturnType<typeof vi.fn>;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

const historyCalls = () =>
  (fetch as FetchMock).mock.calls.filter((c) =>
    String(c[0]).includes('/assistant/messages')
  );

describe('useAIAssistant history auto-restore', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    getSessionMock.mockReset();
    sessionStorage.clear();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('loads persisted messages automatically for a signed-in user', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: 'tok' } },
    });
    (fetch as FetchMock).mockImplementation(async (url: unknown) => {
      const u = String(url);
      if (u.includes('/assistant/messages')) {
        return {
          ok: true,
          json: async () => ({
            messages: [
              {
                id: 'm1',
                thread_id: 't1',
                role: 'user',
                content: 'Add a drive to DC',
                metadata: {},
                created_at: '2026-08-29T10:59:00Z',
              },
              {
                id: 'm2',
                thread_id: 't1',
                role: 'assistant',
                content: "I've added it.",
                metadata: {},
                created_at: '2026-08-29T11:00:00Z',
              },
            ],
            thread_id: 't1',
            hasMore: true,
          }),
        };
      }
      if (u.includes('/assistant/usage')) {
        return {
          ok: true,
          json: async () => ({ used: 1, limit: -1, tier: 'pro', resetAt: '' }),
        };
      }
      return { ok: false, json: async () => ({}) };
    });

    const { result } = renderHook(() => useAIAssistant({ tripId: 'trip-1' }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.historyLoaded).toBe(true));
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1].content).toBe("I've added it.");
    expect(result.current.threadId).toBe('t1');
    expect(result.current.hasMore).toBe(true);
    expect(result.current.isLoading).toBe(false);
    // One restore fetch, not a loop.
    expect(historyCalls()).toHaveLength(1);
  });

  it('does not fetch history for anonymous visitors', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });

    const { result } = renderHook(() => useAIAssistant({ tripId: 'trip-1' }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isAnonymous).toBe(true));
    // Anonymous sessions report history as loaded (nothing persisted to show).
    expect(result.current.historyLoaded).toBe(true);
    expect(historyCalls()).toHaveLength(0);
  });

  it('attempts the restore once and falls back to manual on failure', async () => {
    getSessionMock.mockResolvedValue({
      data: { session: { access_token: 'tok' } },
    });
    (fetch as FetchMock).mockImplementation(async (url: unknown) => {
      const u = String(url);
      if (u.includes('/assistant/messages')) {
        return { ok: false, json: async () => ({}) };
      }
      return {
        ok: true,
        json: async () => ({ used: 1, limit: -1, tier: 'pro', resetAt: '' }),
      };
    });

    const { result } = renderHook(() => useAIAssistant({ tripId: 'trip-1' }), {
      wrapper,
    });

    await waitFor(() => expect(historyCalls()).toHaveLength(1));
    // Let any (erroneous) retry effects settle before asserting.
    await new Promise((r) => setTimeout(r, 50));
    expect(historyCalls()).toHaveLength(1);
    // The manual "Show older chats" path stays available.
    expect(result.current.historyLoaded).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });
});
