/**
 * Friends Service
 *
 * Handles all friend-related operations including discovery, invitations,
 * relationship management, and privacy controls.
 */

import { supabase } from '@/lib/supabase/client';

export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';
export type InvitationStatus = 'pending' | 'accepted' | 'expired';
export type InvitationMethod = 'email' | 'sms' | 'link';

export interface Friend {
  friend_id: string;
  display_name: string | null;
  avatar_url: string | null;
  friendship_since: string;
}

export interface FriendRequest {
  id: string;
  user_id: string;
  friend_id: string;
  status: FriendshipStatus;
  created_at: string;
  requester: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface Invitation {
  id: string;
  inviter_id: string;
  invitee_email: string | null;
  invitee_phone: string | null;
  invitation_code: string;
  status: InvitationStatus;
  sent_via: InvitationMethod;
  sent_at: string;
  expires_at: string;
}

/**
 * Search for users by email or display name
 */
export async function searchUsers(
  query: string
): Promise<{ users: any[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .or(`display_name.ilike.%${query}%`)
      .limit(20);

    if (error) throw error;

    return { users: data || [], error: null };
  } catch (error) {
    console.error('Error searching users:', error);
    return { users: [], error: error as Error };
  }
}

/**
 * Send a friend request
 */
export async function sendFriendRequest(
  friendId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if already friends or pending
    const { data: existing } = await supabase
      .from('friendships')
      .select('*')
      .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`)
      .is('deleted_at', null)
      .maybeSingle();

    if (existing) {
      throw new Error('Friend request already exists');
    }

    // Check if blocked
    const { data: blocked } = await supabase
      .rpc('is_blocked', { user1_id: user.id, user2_id: friendId });

    if (blocked) {
      throw new Error('Cannot send friend request to this user');
    }

    const { error } = await supabase
      .from('friendships')
      .insert({
        user_id: user.id,
        friend_id: friendId,
        status: 'pending',
      } as any);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    console.error('Error sending friend request:', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Accept a friend request
 */
export async function acceptFriendRequest(
  friendshipId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' } as any)
      .eq('id', friendshipId);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    console.error('Error accepting friend request:', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Decline a friend request
 */
export async function declineFriendRequest(
  friendshipId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from('friendships')
      .update({ deleted_at: new Date().toISOString() } as any)
      .eq('id', friendshipId);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    console.error('Error declining friend request:', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Remove a friend
 */
export async function removeFriend(
  friendId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('friendships')
      .update({ deleted_at: new Date().toISOString() } as any)
      .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`)
      .is('deleted_at', null);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    console.error('Error removing friend:', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Block a user
 */
export async function blockUser(
  userId: string,
  reason?: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Remove any existing friendship
    await removeFriend(userId);

    // Create block
    const { error } = await supabase
      .from('blocked_users')
      .insert({
        blocker_id: user.id,
        blocked_id: userId,
        reason,
      } as any);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    console.error('Error blocking user:', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Unblock a user
 */
export async function unblockUser(
  userId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', userId);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    console.error('Error unblocking user:', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Get user's friends
 */
export async function getFriends(): Promise<{ friends: Friend[]; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .rpc('get_user_friends', { user_uuid: user.id });

    if (error) throw error;

    return { friends: data || [], error: null };
  } catch (error) {
    console.error('Error getting friends:', error);
    return { friends: [], error: error as Error };
  }
}

/**
 * Get pending friend requests
 */
export async function getPendingRequests(): Promise<{
  requests: FriendRequest[];
  error: Error | null;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('friendships')
      .select(`
        id,
        user_id,
        friend_id,
        status,
        created_at,
        requester:profiles!friendships_user_id_fkey(display_name, avatar_url)
      `)
      .eq('friend_id', user.id)
      .eq('status', 'pending')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { requests: data as any || [], error: null };
  } catch (error) {
    console.error('Error getting pending requests:', error);
    return { requests: [], error: error as Error };
  }
}

/**
 * Get friend count
 */
export async function getFriendCount(): Promise<{ count: number; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const count = await supabase
      .rpc('get_friend_count', { user_uuid: user.id });

    if (count.error) throw count.error;

    return { count: count.data || 0, error: null };
  } catch (error) {
    console.error('Error getting friend count:', error);
    return { count: 0, error: error as Error };
  }
}

/**
 * Generate invitation code
 */
function generateInvitationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create invitation
 */
export async function createInvitation(
  email?: string,
  phone?: string,
  method: InvitationMethod = 'email'
): Promise<{ invitation: Invitation | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    if (!email && !phone) {
      throw new Error('Email or phone required');
    }

    // Check rate limit
    const { data: rateLimit } = await supabase
      .from('invitation_rate_limits')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (rateLimit) {
      const resetTime = new Date(rateLimit.last_reset);
      const now = new Date();
      const hoursSinceReset = (now.getTime() - resetTime.getTime()) / (1000 * 60 * 60);

      if (hoursSinceReset < 24 && rateLimit.invitations_sent_today >= 20) {
        throw new Error('Daily invitation limit reached (20 per day)');
      }

      // Reset if 24 hours passed
      if (hoursSinceReset >= 24) {
        await supabase
          .from('invitation_rate_limits')
          .update({
            invitations_sent_today: 0,
            last_reset: now.toISOString(),
          } as any)
          .eq('user_id', user.id);
      }
    } else {
      // Create rate limit entry
      await supabase
        .from('invitation_rate_limits')
        .insert({
          user_id: user.id,
          invitations_sent_today: 0,
          last_reset: new Date().toISOString(),
          total_invitations_sent: 0,
        } as any);
    }

    // Create invitation
    const invitationCode = generateInvitationCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const { data: invitation, error } = await supabase
      .from('invitations')
      .insert({
        inviter_id: user.id,
        invitee_email: email,
        invitee_phone: phone,
        invitation_code: invitationCode,
        sent_via: method,
        expires_at: expiresAt.toISOString(),
      } as any)
      .select()
      .single();

    if (error) throw error;

    // Update rate limit
    await supabase.rpc('increment', {
      table_name: 'invitation_rate_limits',
      column_name: 'invitations_sent_today',
      user_id: user.id,
    });

    return { invitation: invitation as any, error: null };
  } catch (error) {
    console.error('Error creating invitation:', error);
    return { invitation: null, error: error as Error };
  }
}

/**
 * Get user's sent invitations
 */
export async function getSentInvitations(): Promise<{
  invitations: Invitation[];
  error: Error | null;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('inviter_id', user.id)
      .order('sent_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return { invitations: data as any || [], error: null };
  } catch (error) {
    console.error('Error getting sent invitations:', error);
    return { invitations: [], error: error as Error };
  }
}
