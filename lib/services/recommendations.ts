/**
 * Recommendation Service
 *
 * Comprehensive recommendation system with caching, analytics tracking,
 * and support for multiple recommendation types (personalized, trending, nearby)
 */

import { supabase } from '@/lib/supabase/client';

export interface Recommendation {
  id: string;
  name: string;
  category: string;
  attributes: {
    cuisine_type?: string;
    price_range?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    google_rating?: number;
    [key: string]: any;
  };
  recommendation_score: number;
  score_breakdown?: {
    personal_taste: number;
    social_match: number;
    location_proximity: number;
    popularity: number;
    has_friend_match: boolean;
    distance_km: string | null;
  };
  distance_meters?: number;
  is_fallback?: boolean;
  fallback_reason?: string;
}

export interface RecommendationMetadata {
  total_candidates: number;
  friend_count: number;
  has_taste_profile: boolean;
  location: {
    latitude: number;
    longitude: number;
  };
  algorithm_version: string;
  used_fallback: boolean;
}

export interface RecommendationResponse {
  recommendations: Recommendation[];
  metadata: RecommendationMetadata;
  from_cache: boolean;
  cache_age_minutes?: number;
}

export interface TrendingItem {
  id: string;
  item_id: string;
  category: string;
  trending_score: number;
  rating_count: number;
  avg_rating: number;
  recent_activity_count: number;
  rank: number;
  item: Recommendation;
}

interface GetRecommendationsOptions {
  category?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  limit?: number;
  forceRefresh?: boolean;
}

/**
 * Get personalized recommendations using the Edge Function
 */
export async function getPersonalizedRecommendations(
  options: GetRecommendationsOptions = {}
): Promise<{ recommendations: Recommendation[]; metadata: RecommendationMetadata; error: Error | null }> {
  try {
    const {
      category = 'restaurant',
      latitude = 39.7392, // Denver, CO default
      longitude = -104.9903,
      radius = 15000,
      limit = 20,
      forceRefresh = false,
    } = options;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const params = new URLSearchParams({
      category,
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      radius: radius.toString(),
      limit: limit.toString(),
      force_refresh: forceRefresh.toString(),
    });

    const response = await fetch(
      `${supabaseUrl}/functions/v1/get-recommendations?${params}`,
      {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get recommendations: ${response.statusText}`);
    }

    const data: RecommendationResponse = await response.json();

    return {
      recommendations: data.recommendations,
      metadata: data.metadata,
      error: null,
    };
  } catch (error) {
    console.error('Error getting personalized recommendations:', error);
    return {
      recommendations: [],
      metadata: {
        total_candidates: 0,
        friend_count: 0,
        has_taste_profile: false,
        location: { latitude: 0, longitude: 0 },
        algorithm_version: '0.0',
        used_fallback: true,
      },
      error: error as Error,
    };
  }
}

/**
 * Get trending items for a category
 */
export async function getTrendingItems(
  category: string = 'restaurant',
  limit: number = 20
): Promise<{ trending: TrendingItem[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('trending_items')
      .select(`
        *,
        item:items!item_id (
          id,
          name,
          category,
          attributes,
          location
        )
      `)
      .eq('category', category)
      .order('rank', { ascending: true })
      .limit(limit);

    if (error) throw error;

    return {
      trending: (data || []) as any,
      error: null,
    };
  } catch (error) {
    console.error('Error getting trending items:', error);
    return {
      trending: [],
      error: error as Error,
    };
  }
}

/**
 * Refresh trending items (call this periodically)
 */
export async function refreshTrendingItems(
  category: string = 'restaurant'
): Promise<{ success: boolean; count: number; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('refresh_trending_items', {
      target_category: category,
    });

    if (error) throw error;

    return {
      success: true,
      count: data || 0,
      error: null,
    };
  } catch (error) {
    console.error('Error refreshing trending items:', error);
    return {
      success: false,
      count: 0,
      error: error as Error,
    };
  }
}

/**
 * Track recommendation click/view for analytics
 */
export async function trackRecommendationView(
  itemId: string,
  recommendationScore: number,
  position: number,
  sessionId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('recommendation_analytics')
      .insert({
        user_id: user.id,
        item_id: itemId,
        recommendation_score: recommendationScore,
        position,
        was_clicked: true,
        session_id: sessionId,
      });

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    console.error('Error tracking recommendation view:', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Track when a recommendation leads to a rating
 */
export async function trackRecommendationRating(
  itemId: string,
  ratingValue: number,
  sessionId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Update existing analytics entry
    const { error } = await supabase
      .from('recommendation_analytics')
      .update({
        was_rated: true,
        rating_value: ratingValue,
      })
      .eq('user_id', user.id)
      .eq('item_id', itemId)
      .eq('session_id', sessionId);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    console.error('Error tracking recommendation rating:', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Invalidate user's recommendation cache
 */
export async function invalidateRecommendationCache(): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.rpc('invalidate_user_cache', {
      target_user_id: user.id,
    });

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    console.error('Error invalidating cache:', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Get recommendation analytics for user (for insights)
 */
export async function getRecommendationAnalytics(
  limit: number = 50
): Promise<{ analytics: any[]; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('recommendation_analytics')
      .select(`
        *,
        item:items!item_id (
          name,
          category,
          attributes
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return {
      analytics: data || [],
      error: null,
    };
  } catch (error) {
    console.error('Error getting recommendation analytics:', error);
    return {
      analytics: [],
      error: error as Error,
    };
  }
}

/**
 * Generate a session ID for tracking recommendations
 */
export function generateSessionId(): string {
  return `rec_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}
