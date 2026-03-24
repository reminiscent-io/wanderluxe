import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock before importing the module under test
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

// Also mock window.location.origin for buildInviteUrl
Object.defineProperty(window, 'location', {
  value: { origin: 'https://app.wanderluxe.com' },
  writable: true,
});

import {
  createInviteLink,
  getInviteLinks,
  getInviteLinkPreview,
  redeemInviteLink,
  disableInviteLink,
  updateInviteLink,
  deleteInviteLink,
  buildInviteUrl,
  buildShareText,
} from './inviteLinkService';
import { supabase } from '@/integrations/supabase/client';

const mockSupabase = supabase as any;

const MOCK_USER_ID = 'user-abc-123';
const MOCK_TRIP_ID = 'trip-xyz-456';
const MOCK_LINK_ID = 'link-def-789';
const MOCK_CODE = 'AbCdEfGh';

const makeMockLink = (overrides = {}) => ({
  id: MOCK_LINK_ID,
  trip_id: MOCK_TRIP_ID,
  created_by_user_id: MOCK_USER_ID,
  invite_code: MOCK_CODE,
  permission_level: 'read',
  expires_at: null,
  is_active: true,
  created_at: '2026-03-24T00:00:00Z',
  ...overrides,
});

// Builder for chainable Supabase query mocks
const makeQueryBuilder = (resolvedValue: { data: any; error: any }) => {
  const builder: any = {
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolvedValue),
  };
  // Make the builder itself thenable so `await supabase.from(...).delete().eq(...)` works
  builder.then = (resolve: any) => Promise.resolve(resolvedValue).then(resolve);
  return builder;
};

describe('inviteLinkService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // createInviteLink
  // ---------------------------------------------------------------------------
  describe('createInviteLink', () => {
    it('creates a read-only link that never expires', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: MOCK_USER_ID } },
        error: null,
      });
      const mockLink = makeMockLink({ permission_level: 'read', expires_at: null });
      mockSupabase.from.mockReturnValue(makeQueryBuilder({ data: mockLink, error: null }));

      const result = await createInviteLink(MOCK_TRIP_ID, 'read', true);

      expect(result.permission_level).toBe('read');
      expect(result.expires_at).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith('trip_invite_links');
    });

    it('creates an edit link with 48-hour expiry when neverExpires is false', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: MOCK_USER_ID } },
        error: null,
      });
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      const mockLink = makeMockLink({ permission_level: 'edit', expires_at: futureDate });
      mockSupabase.from.mockReturnValue(makeQueryBuilder({ data: mockLink, error: null }));

      const result = await createInviteLink(MOCK_TRIP_ID, 'edit', false);

      expect(result.permission_level).toBe('edit');
      expect(result.expires_at).not.toBeNull();
      // expires_at should be approximately 48 hours from now
      const expiresAtMs = new Date(result.expires_at!).getTime();
      const nowMs = Date.now();
      expect(expiresAtMs).toBeGreaterThan(nowMs + 47 * 60 * 60 * 1000);
      expect(expiresAtMs).toBeLessThan(nowMs + 49 * 60 * 60 * 1000);
    });

    it('throws "Authentication required" when user is not logged in', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await expect(createInviteLink(MOCK_TRIP_ID, 'read', true)).rejects.toThrow(
        'Authentication required'
      );
    });

    it('retries on unique constraint violation (23505) and succeeds on second attempt', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: MOCK_USER_ID } },
        error: null,
      });

      const mockLink = makeMockLink();
      // First call fails with unique violation, second succeeds
      mockSupabase.from
        .mockReturnValueOnce(
          makeQueryBuilder({ data: null, error: { code: '23505', message: 'unique violation' } })
        )
        .mockReturnValue(makeQueryBuilder({ data: mockLink, error: null }));

      const result = await createInviteLink(MOCK_TRIP_ID, 'read', true);

      expect(result.invite_code).toBe(MOCK_CODE);
      expect(mockSupabase.from).toHaveBeenCalledTimes(2);
    });

    it('throws after 3 unique constraint violations', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: MOCK_USER_ID } },
        error: null,
      });

      const uniqueError = { code: '23505', message: 'unique violation' };
      mockSupabase.from.mockReturnValue(
        makeQueryBuilder({ data: null, error: uniqueError })
      );

      // The 3rd attempt hits `throw error` directly (attempt < 2 is false),
      // so the service re-throws the original Supabase unique-constraint error.
      await expect(createInviteLink(MOCK_TRIP_ID, 'read', true)).rejects.toMatchObject({
        code: '23505',
      });
      expect(mockSupabase.from).toHaveBeenCalledTimes(3);
    });

    it('propagates non-unique-violation errors immediately', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: MOCK_USER_ID } },
        error: null,
      });

      mockSupabase.from.mockReturnValue(
        makeQueryBuilder({ data: null, error: { code: '42501', message: 'permission denied' } })
      );

      await expect(createInviteLink(MOCK_TRIP_ID, 'read', false)).rejects.toMatchObject({
        code: '42501',
      });
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // getInviteLinks
  // ---------------------------------------------------------------------------
  describe('getInviteLinks', () => {
    it('returns a list of invite links for a trip', async () => {
      const links = [makeMockLink(), makeMockLink({ id: 'link-2', invite_code: 'XxYyZzWw' })];
      const builder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: links, error: null }),
      };
      mockSupabase.from.mockReturnValue(builder);

      const result = await getInviteLinks(MOCK_TRIP_ID);

      expect(result).toHaveLength(2);
      expect(result[0].invite_code).toBe(MOCK_CODE);
    });

    it('returns empty array when no links exist', async () => {
      const builder: any = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      mockSupabase.from.mockReturnValue(builder);

      const result = await getInviteLinks(MOCK_TRIP_ID);
      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // getInviteLinkPreview
  // ---------------------------------------------------------------------------
  describe('getInviteLinkPreview', () => {
    it('returns preview data for a valid code', async () => {
      const preview = {
        trip_id: MOCK_TRIP_ID,
        destination: 'Paris',
        cover_image_url: 'https://example.com/paris.jpg',
        arrival_date: '2026-06-01',
        departure_date: '2026-06-10',
        inviter_name: 'Alice',
      };
      mockSupabase.rpc.mockResolvedValue({ data: preview, error: null });

      const result = await getInviteLinkPreview(MOCK_CODE);

      expect(result).not.toBeNull();
      expect(result!.destination).toBe('Paris');
      expect(result!.inviter_name).toBe('Alice');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_invite_link_preview', {
        p_invite_code: MOCK_CODE,
      });
    });

    it('returns preview data when RPC returns an array (Supabase quirk)', async () => {
      const preview = { trip_id: MOCK_TRIP_ID, destination: 'Tokyo', cover_image_url: null,
        arrival_date: '2026-08-01', departure_date: '2026-08-14', inviter_name: 'Bob' };
      mockSupabase.rpc.mockResolvedValue({ data: [preview], error: null });

      const result = await getInviteLinkPreview(MOCK_CODE);

      expect(result!.destination).toBe('Tokyo');
    });

    it('returns null for an invalid or expired code (empty array)', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const result = await getInviteLinkPreview('EXPIRED1');
      expect(result).toBeNull();
    });

    it('returns null when RPC returns null data', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      const result = await getInviteLinkPreview('BADCODE1');
      expect(result).toBeNull();
    });

    it('throws when RPC returns an error', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Link not found or expired' },
      });

      await expect(getInviteLinkPreview(MOCK_CODE)).rejects.toMatchObject({
        message: 'Link not found or expired',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // redeemInviteLink
  // ---------------------------------------------------------------------------
  describe('redeemInviteLink', () => {
    it('returns the trip_id on successful redemption (view access)', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: MOCK_TRIP_ID, error: null });

      const result = await redeemInviteLink(MOCK_CODE);

      expect(result).toBe(MOCK_TRIP_ID);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('redeem_invite_link', {
        p_invite_code: MOCK_CODE,
      });
    });

    it('returns the trip_id on successful redemption (edit access)', async () => {
      const editTripId = 'trip-edit-999';
      mockSupabase.rpc.mockResolvedValue({ data: editTripId, error: null });

      const result = await redeemInviteLink('EDITCODE');
      expect(result).toBe(editTripId);
    });

    it('throws when the link is expired', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Invite link has expired' },
      });

      await expect(redeemInviteLink('EXPIRED1')).rejects.toMatchObject({
        message: 'Invite link has expired',
      });
    });

    it('throws when the link is disabled', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Invite link is not active' },
      });

      await expect(redeemInviteLink('DISABLED1')).rejects.toMatchObject({
        message: 'Invite link is not active',
      });
    });

    it('throws when the link code does not exist', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Invite link not found' },
      });

      await expect(redeemInviteLink('NOTFOUND')).rejects.toBeTruthy();
    });
  });

  // ---------------------------------------------------------------------------
  // disableInviteLink
  // ---------------------------------------------------------------------------
  describe('disableInviteLink', () => {
    it('calls update with is_active: false on the correct link', async () => {
      const builder: any = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      mockSupabase.from.mockReturnValue(builder);

      await disableInviteLink(MOCK_LINK_ID);

      expect(builder.update).toHaveBeenCalledWith({ is_active: false });
      expect(builder.eq).toHaveBeenCalledWith('id', MOCK_LINK_ID);
    });
  });

  // ---------------------------------------------------------------------------
  // updateInviteLink
  // ---------------------------------------------------------------------------
  describe('updateInviteLink', () => {
    it('updates permission_level to edit', async () => {
      const builder: any = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      mockSupabase.from.mockReturnValue(builder);

      await updateInviteLink(MOCK_LINK_ID, { permission_level: 'edit' });

      expect(builder.update).toHaveBeenCalledWith({ permission_level: 'edit' });
    });

    it('updates expires_at to null (never expires)', async () => {
      const builder: any = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      mockSupabase.from.mockReturnValue(builder);

      await updateInviteLink(MOCK_LINK_ID, { expires_at: null });

      expect(builder.update).toHaveBeenCalledWith({ expires_at: null });
    });
  });

  // ---------------------------------------------------------------------------
  // deleteInviteLink
  // ---------------------------------------------------------------------------
  describe('deleteInviteLink', () => {
    it('calls delete on the correct link id', async () => {
      const builder: any = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      mockSupabase.from.mockReturnValue(builder);

      await deleteInviteLink(MOCK_LINK_ID);

      expect(builder.delete).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('id', MOCK_LINK_ID);
    });
  });

  // ---------------------------------------------------------------------------
  // buildInviteUrl
  // ---------------------------------------------------------------------------
  describe('buildInviteUrl', () => {
    it('builds the correct invite URL from origin and code', () => {
      const url = buildInviteUrl(MOCK_CODE);
      expect(url).toBe(`https://app.wanderluxe.com/invite/${MOCK_CODE}`);
    });
  });

  // ---------------------------------------------------------------------------
  // buildShareText
  // ---------------------------------------------------------------------------
  describe('buildShareText', () => {
    const url = 'https://app.wanderluxe.com/invite/AbCdEfGh';

    it('includes destination name in the message', () => {
      const text = buildShareText('Alice', 'Paris', url);
      expect(text).toContain('Alice');
      expect(text).toContain('Paris');
      expect(text).toContain(url);
    });

    it('falls back to generic text when destination is empty', () => {
      const text = buildShareText('Bob', '', url);
      expect(text).toContain('Bob');
      expect(text).toContain(url);
      // Should not contain the destination-specific format
      expect(text).not.toContain('""');
    });
  });
});
