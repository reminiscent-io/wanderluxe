import { supabase } from '@/integrations/supabase/client';
import type { InviteLink, InviteLinkPreview } from '@/integrations/supabase/invite_link_types';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join('');
}

export async function createInviteLink(
  tripId: string,
  permissionLevel: 'read' | 'edit',
  neverExpires: boolean
): Promise<InviteLink> {
  const expiresAt = neverExpires ? null : new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication required');

  // Retry up to 3 times on unique constraint violation (code collision)
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateCode();

    const { data, error } = await supabase
      .from('trip_invite_links')
      .insert({
        trip_id: tripId,
        created_by_user_id: user.id,
        invite_code: code,
        permission_level: permissionLevel,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) {
      // 23505 = unique_violation in PostgreSQL
      if (error.code === '23505' && attempt < 2) continue;
      throw error;
    }

    return data as unknown as InviteLink;
  }

  throw new Error('Failed to generate a unique invite code after 3 attempts');
}

export async function getInviteLinks(tripId: string): Promise<InviteLink[]> {
  const { data, error } = await supabase
    .from('trip_invite_links')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as InviteLink[];
}

export async function disableInviteLink(linkId: string): Promise<void> {
  const { error } = await supabase
    .from('trip_invite_links')
    .update({ is_active: false })
    .eq('id', linkId);

  if (error) throw error;
}

export async function updateInviteLink(
  linkId: string,
  updates: { permission_level?: 'read' | 'edit'; expires_at?: string | null }
): Promise<void> {
  const { error } = await supabase
    .from('trip_invite_links')
    .update(updates)
    .eq('id', linkId);

  if (error) throw error;
}

export async function deleteInviteLink(linkId: string): Promise<void> {
  const { error } = await supabase
    .from('trip_invite_links')
    .delete()
    .eq('id', linkId);

  if (error) throw error;
}

export async function getInviteLinkPreview(code: string): Promise<InviteLinkPreview | null> {
  const { data, error } = await supabase.rpc('get_invite_link_preview', {
    p_invite_code: code,
  });

  if (error) throw error;
  if (!data || (Array.isArray(data) && data.length === 0)) return null;
  return (Array.isArray(data) ? data[0] : data) as unknown as InviteLinkPreview;
}

export async function redeemInviteLink(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('redeem_invite_link', {
    p_invite_code: code,
  });

  if (error) throw error;
  return data as unknown as string;
}

export function buildInviteUrl(code: string): string {
  return `${window.location.origin}/invite/${code}`;
}

export function buildShareText(ownerName: string, tripDestination: string, url: string): string {
  const preamble = tripDestination
    ? `${ownerName} invited you to join "${tripDestination}" on WanderLuxe! Click the link to view details and start planning together.`
    : `${ownerName} invited you to join a trip on WanderLuxe!`;
  return `${preamble}\n${url}`;
}
