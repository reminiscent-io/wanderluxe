import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

let mockAuth: { user: { id: string } | null; profileLoaded: boolean };
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

import AuthCacheSync from './AuthCacheSync';

const TRIP_KEY = ['trip', 'a4268df2-d4a5-44f6-b23b-87cf6e96aee2'];

function renderWith(queryClient: QueryClient) {
  const tree = () => (
    <QueryClientProvider client={queryClient}>
      <AuthCacheSync />
    </QueryClientProvider>
  );
  const utils = render(tree());
  return { ...utils, refresh: () => utils.rerender(tree()) };
}

describe('AuthCacheSync', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockAuth = { user: null, profileLoaded: true };
  });

  it('drops what an anonymous visitor cached once they sign in', () => {
    // RLS hid the trip from the logged-out reader, so `null` is cached under a
    // key the signed-in owner will read from next.
    queryClient.setQueryData(TRIP_KEY, null);
    const { refresh } = renderWith(queryClient);

    mockAuth = { user: { id: 'owner-1' }, profileLoaded: true };
    refresh();

    expect(queryClient.getQueryData(TRIP_KEY)).toBeUndefined();
  });

  it('drops the previous user rows on sign-out', () => {
    mockAuth = { user: { id: 'owner-1' }, profileLoaded: true };
    const { refresh } = renderWith(queryClient);
    queryClient.setQueryData(TRIP_KEY, { destination: 'Vienna' });

    mockAuth = { user: null, profileLoaded: true };
    refresh();

    expect(queryClient.getQueryData(TRIP_KEY)).toBeUndefined();
  });

  it('keeps the cache when the same user stays signed in', () => {
    mockAuth = { user: { id: 'owner-1' }, profileLoaded: true };
    const { refresh } = renderWith(queryClient);
    queryClient.setQueryData(TRIP_KEY, { destination: 'Vienna' });

    refresh();

    expect(queryClient.getQueryData(TRIP_KEY)).toEqual({ destination: 'Vienna' });
  });

  it('does not treat unresolved auth as a signed-out identity', () => {
    // A restoring session reads as user: null. Clearing on that, then again
    // when the session lands, would throw away every in-flight page load.
    mockAuth = { user: null, profileLoaded: false };
    const { refresh } = renderWith(queryClient);
    queryClient.setQueryData(TRIP_KEY, { destination: 'Vienna' });

    mockAuth = { user: { id: 'owner-1' }, profileLoaded: true };
    refresh();

    expect(queryClient.getQueryData(TRIP_KEY)).toEqual({ destination: 'Vienna' });
  });
});
