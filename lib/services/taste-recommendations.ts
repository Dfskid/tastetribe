/**
 * Taste-Based Recommendation Service
 *
 * Client-side service for calling the enhanced recommendation Edge Function
 */

import { createClient } from '@/lib/supabase/client';

export interface TasteRecommendation {
  item_id: string;
  item_name: string;
  category: string;
  score: number;
  personal_score: number;
  friends_score: number;
  taste_twins_count: number;
  attributes: {
    cuisine_type?: string;
    price_range?: string;
    address?: string;
    image_url?: string;
    photo_url?: string;
  };
}

export interface TasteRecommendationsResponse {
  recommendations: TasteRecommendation[];
  taste_twins_count: number;
  user_ratings_count: number;
  message?: string;
}

/**
 * Fetches personalized recommendations using the enhanced algorithm
 *
 * This calls the Supabase Edge Function that implements:
 * - Taste vector generation
 * - Cosine similarity calculations
 * - Friend taste matching ("taste twins")
 * - Blended scoring (30% personal + 70% friends)
 */
export async function getEnhancedRecommendations(
  userId: string
): Promise<TasteRecommendationsResponse> {
  const supabase = createClient();

  try {
    // Get current session for authentication
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Authentication required');
    }

    // Call the Edge Function
    const apiUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-enhanced-recommendations`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch recommendations');
    }

    const data: TasteRecommendationsResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching enhanced recommendations:', error);
    throw error;
  }
}

/**
 * Fetches a single recommendation item with full details
 */
export async function getRecommendationDetails(itemId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('id', itemId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching recommendation details:', error);
    throw error;
  }

  return data;
}

/**
 * Tracks when a user views a recommendation
 * (useful for analytics and improving the algorithm)
 */
export async function trackRecommendationView(
  userId: string,
  itemId: string,
  score: number
) {
  const supabase = createClient();

  await supabase.rpc('track_event', {
    p_user_id: userId,
    p_event_type: 'recommendation_viewed',
    p_event_category: 'recommendations',
    p_metadata: {
      item_id: itemId,
      recommendation_score: score,
      algorithm: 'enhanced_taste_based',
    },
  });
}

/**
 * Tracks when a user clicks on a recommendation
 */
export async function trackRecommendationClick(
  userId: string,
  itemId: string,
  score: number
) {
  const supabase = createClient();

  await supabase.rpc('track_event', {
    p_user_id: userId,
    p_event_type: 'recommendation_clicked',
    p_event_category: 'recommendations',
    p_metadata: {
      item_id: itemId,
      recommendation_score: score,
      algorithm: 'enhanced_taste_based',
    },
  });
}
