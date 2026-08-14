import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockFrom },
}));

vi.mock('./useIsAdmin', () => ({
  useIsAdmin: () => ({ isAdmin: false, isLoading: false, error: null }),
}));

let mockAuth: { user: { id: string; email: string } | null; profileLoaded: boolean };
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

import { useTripPermissions } from './use-trip-permissions';

// ─── Helpers ────────────────────────────────────────────────────────────────

const TRIP_ID = 'a4268df2-d4a5-44f6-b23b-87cf6e96aee2';
const OWNER = { id: 'owner-1', email: 'owner@example.com' };

/** trips/trip_shares both read as select → eq(…) → single(). */
function stubTables(responses: Record<string, { data: unknown; error: unknown }>) {
  mockFrom.mockImplementation((table: string) => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      single: () => Promise.resolve(responses[table] ?? { data: null, error: { message: 'no row' } }),
    };
    return chain;
  });
}

const PRIVATE_TRIP = { data: { user_id: OWNER.id, is_public: false }, error: null };

beforeEach(() => {
  vi.clearAllMocks();
  mockAuth = { user: OWNER, profileLoaded: true };
  stubTables({ trips: PRIVATE_TRIP });
});

describe('useTripPermissions — arriving from an email link', () => {
  it('does not answer while auth is still restoring', async () => {
    // A cold page load from a reminder email gets here before the session is
    // back. Answering now would deny the owner their own trip.
    mockAuth = { user: null, profileLoaded: false };

    const { result } = renderHook(() => useTripPermissions(TRIP_ID));

    await new Promise((r) => setTimeout(r, 20));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.canView).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('grants the owner access once auth resolves', async () => {
    mockAuth = { user: null, profileLoaded: false };
    const { result, rerender } = renderHook(() => useTripPermissions(TRIP_ID));

    await waitFor(() => expect(result.current.isLoading).toBe(true));

    // Session restored — the check has to run again, not keep its early answer.
    mockAuth = { user: OWNER, profileLoaded: true };
    rerender();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.canView).toBe(true);
      expect(result.current.isOwner).toBe(true);
      expect(result.current.canEdit).toBe(true);
    });
  });

  it('re-checks when a different user signs in', async () => {
    const { result, rerender } = renderHook(() => useTripPermissions(TRIP_ID));

    await waitFor(() => expect(result.current.isOwner).toBe(true));

    mockAuth = { user: { id: 'stranger-1', email: 'stranger@example.com' }, profileLoaded: true };
    rerender();

    await waitFor(() => {
      expect(result.current.isOwner).toBe(false);
      expect(result.current.canView).toBe(false);
    });
  });

  it('reports no access for a signed-out visitor to a private trip', async () => {
    mockAuth = { user: null, profileLoaded: true };

    const { result } = renderHook(() => useTripPermissions(TRIP_ID));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.canView).toBe(false);
    });
  });

  it('lets a signed-out visitor read a public trip', async () => {
    mockAuth = { user: null, profileLoaded: true };
    stubTables({ trips: { data: { user_id: OWNER.id, is_public: true }, error: null } });

    const { result } = renderHook(() => useTripPermissions(TRIP_ID));

    await waitFor(() => {
      expect(result.current.canView).toBe(true);
      expect(result.current.canEdit).toBe(false);
    });
  });

  it('grants a shared viewer read access once the share is accepted', async () => {
    mockAuth = { user: { id: 'guest-1', email: 'guest@example.com' }, profileLoaded: true };
    stubTables({
      trips: PRIVATE_TRIP,
      trip_shares: { data: { permission_level: 'read', share_status: 'accepted' }, error: null },
    });

    const { result } = renderHook(() => useTripPermissions(TRIP_ID));

    await waitFor(() => {
      expect(result.current.canView).toBe(true);
      expect(result.current.canEdit).toBe(false);
      expect(result.current.permissionLevel).toBe('read');
    });
  });

  it('withholds access on a share the invitee has not accepted', async () => {
    mockAuth = { user: { id: 'guest-1', email: 'guest@example.com' }, profileLoaded: true };
    stubTables({
      trips: PRIVATE_TRIP,
      trip_shares: { data: { permission_level: 'edit', share_status: 'pending' }, error: null },
    });

    const { result } = renderHook(() => useTripPermissions(TRIP_ID));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.canView).toBe(false);
  });
});
