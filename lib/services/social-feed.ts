/**
 * Social Feed Service
 *
 * Manages the activity feed, combining user's own activities with friends'
 * activities for a personalized social discovery experience.
 */

import { supabase } from '@/lib/supabase/client';
import { Item } from '@/lib/supabase/types';

export type ActivityType = 'rating' | 'favorite' | 'review' | 'friend_joined' | 'milestone';
export type ProfileVisibility = 'public' | 'friends_only' | 'private';

export interface FeedActivity {
  id: string;
  user_id: string;
  activity_type: ActivityType;
  item_id: string | null;
  rating_value: number | null;
  content: string | null;
  visibility: ProfileVisibility;
  created_at: string;
  user: {
    display_name: string | null;
    avatar_url: string | null;
  };
  item?: {
    id: string;
    name: string;
    category: string;
    attributes: any;
  };
}

export interface FeedOptions {
  limit?: number;
  offset?: number;
  includeOwnActivity?: boolean;
  friendsOnly?: boolean;
}

/**
 * Get personalized feed for user
 * Combines own activities with friends' activities
 */
export async function getPersonalizedFeed(
  options: FeedOptions = {}
): Promise<{ activities: FeedActivity[]; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const {
      limit = 20,
      offset = 0,
      includeOwnActivity = true,
      friendsOnly = false,
    } = options;

    // Get user's friends
    const { data: friends } = await supabase.rpc('get_user_friends', {
      user_uuid: user.id,
    });

    const friendIds = friends?.map((f: any) => f.friend_id) || [];

    // Build query
    let query = supabase
      .from('activity_feed')
      .select(`
        id,
        user_id,
        activity_type,
        item_id,
        rating_value,
        content,
        visibility,
        created_at,
        user:profiles!activity_feed_user_id_fkey(display_name, avatar_url),
        item:items(id, name, category, attributes)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (friendsOnly) {
      // Only friends' activities
      query = query.in('user_id', friendIds);
    } else if (includeOwnActivity && friendIds.length > 0) {
      // Own activities + friends' activities
      query = query.in('user_id', [user.id, ...friendIds]);
    } else if (includeOwnActivity) {
      // Only own activities (no friends yet)
      query = query.eq('user_id', user.id);
    } else {
      // Public activities
      query = query.eq('visibility', 'public');
    }

    const { data, error } = await query;

    if (error) throw error;

    return { activities: data as any || [], error: null };
  } catch (error) {
    console.error('Error getting personalized feed:', error);
    return { activities: [], error: error as Error };
  }
}

/**
 * Get activities for a specific user
 */
export async function getUserActivities(
  userId: string,
  limit: number = 20
): Promise<{ activities: FeedActivity[]; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if user is viewing their own profile or a friend's profile
    const isSelf = user.id === userId;
    const { data: areFriends } = await supabase.rpc('are_friends', {
      user1_id: user.id,
      user2_id: userId,
    });

    let query = supabase
      .from('activity_feed')
      .select(`
        id,
        user_id,
        activity_type,
        item_id,
        rating_value,
        content,
        visibility,
        created_at,
        user:profiles!activity_feed_user_id_fkey(display_name, avatar_url),
        item:items(id, name, category, attributes)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filter by visibility
    if (!isSelf) {
      if (areFriends) {
        query = query.in('visibility', ['public', 'friends_only']);
      } else {
        query = query.eq('visibility', 'public');
      }
    }

    const { data, error } = await query;

    if (error) throw error;

    return { activities: data as any || [], error: null };
  } catch (error) {
    console.error('Error getting user activities:', error);
    return { activities: [], error: error as Error };
  }
}

/**
 * Create activity for rating
 * (Automatically created by database trigger)
 */
export async function createRatingActivity(
  itemId: string,
  ratingValue: number,
  review?: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get user's privacy settings
    const { data: privacySettings } = await supabase
      .from('user_privacy_settings')
      .select('show_ratings, profile_visibility')
      .eq('user_id', user.id)
      .single();

    if (!privacySettings?.show_ratings) {
      return { success: true, error: null }; // User opted out
    }

    const { error } = await supabase
      .from('activity_feed')
      .insert({
        user_id: user.id,
        activity_type: 'rating',
        item_id: itemId,
        rating_value: ratingValue,
        content: review,
        visibility: privacySettings.profile_visibility || 'public',
      } as any);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    console.error('Error creating rating activity:', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Create activity for adding favorite
 */
export async function createFavoriteActivity(
  itemId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get user's privacy settings
    const { data: privacySettings } = await supabase
      .from('user_privacy_settings')
      .select('show_favorites, profile_visibility')
      .eq('user_id', user.id)
      .single();

    if (!privacySettings?.show_favorites) {
      return { success: true, error: null }; // User opted out
    }

    const { error } = await supabase
      .from('activity_feed')
      .insert({
        user_id: user.id,
        activity_type: 'favorite',
        item_id: itemId,
        visibility: privacySettings.profile_visibility || 'public',
      } as any);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    console.error('Error creating favorite activity:', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Subscribe to real-time feed updates
 */
export function subscribeToFeedUpdates(
  onUpdate: (activity: FeedActivity) => void,
  onError?: (error: Error) => void
) {
  const channel = supabase
    .channel('feed-updates')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'activity_feed',
      },
      async (payload) => {
        // Fetch complete activity data with relationships
        const { data } = await supabase
          .from('activity_feed')
          .select(`
            id,
            user_id,
            activity_type,
            item_id,
            rating_value,
            content,
            visibility,
            created_at,
            user:profiles!activity_feed_user_id_fkey(display_name, avatar_url),
            item:items(id, name, category, attributes)
          `)
          .eq('id', payload.new.id)
          .single();

        if (data) {
          onUpdate(data as any);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Get feed statistics
 */
export async function getFeedStats(): Promise<{
  totalActivities: number;
  friendActivities: number;
  todayActivities: number;
  error: Error | null;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get friends
    const { data: friends } = await supabase.rpc('get_user_friends', {
      user_uuid: user.id,
    });
    const friendIds = friends?.map((f: any) => f.friend_id) || [];

    // Get total activities count
    const { count: totalCount } = await supabase
      .from('activity_feed')
      .select('*', { count: 'exact', head: true })
      .in('user_id', [user.id, ...friendIds]);

    // Get friend activities count
    const { count: friendCount } = await supabase
      .from('activity_feed')
      .select('*', { count: 'exact', head: true })
      .in('user_id', friendIds);

    // Get today's activities
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count: todayCount } = await supabase
      .from('activity_feed')
      .select('*', { count: 'exact', head: true })
      .in('user_id', [user.id, ...friendIds])
      .gte('created_at', today.toISOString());

    return {
      totalActivities: totalCount || 0,
      friendActivities: friendCount || 0,
      todayActivities: todayCount || 0,
      error: null,
    };
  } catch (error) {
    console.error('Error getting feed stats:', error);
    return {
      totalActivities: 0,
      friendActivities: 0,
      todayActivities: 0,
      error: error as Error,
    };
  }
}
