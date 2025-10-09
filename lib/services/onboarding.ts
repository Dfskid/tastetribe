/**
 * Onboarding Service
 *
 * Handles restaurant fetching and rating during the user onboarding process
 */

import { createClient } from '@/lib/supabase/client';
import { getLocationWithFallback, type GeolocationCoordinates } from './geolocation';

export interface Restaurant {
  id: string;
  name: string;
  cuisine_type?: string;
  price_range?: string;
  address?: string;
  image_url?: string;
  latitude?: number;
  longitude?: number;
}

export interface OnboardingProgress {
  totalRestaurants: number;
  ratedCount: number;
  skippedCount: number;
  isComplete: boolean;
}

const MINIMUM_RATINGS_REQUIRED = 10;
const RESTAURANTS_TO_FETCH = 15;

/**
 * Fetch restaurants near a location for onboarding
 */
export async function fetchOnboardingRestaurants(
  userLocation?: GeolocationCoordinates
): Promise<Restaurant[]> {
  const supabase = createClient();

  // Get location with fallback
  const location = userLocation || (await getLocationWithFallback()).coordinates;

  try {
    // Query restaurants using PostGIS for location-based ordering
    const { data, error } = await supabase.rpc('get_nearby_restaurants', {
      user_lat: location.latitude,
      user_lng: location.longitude,
      max_distance: 50000, // 50km radius
      limit_count: RESTAURANTS_TO_FETCH,
    });

    if (error) {
      console.error('Error fetching restaurants with location:', error);
      // Fallback to simple query without distance calculation
      return await fetchRestaurantsSimple();
    }

    if (!data || data.length === 0) {
      return await fetchRestaurantsSimple();
    }

    return data.map((item: any) => parseRestaurant(item));
  } catch (error) {
    console.error('Error in fetchOnboardingRestaurants:', error);
    return await fetchRestaurantsSimple();
  }
}

/**
 * Simple fallback restaurant fetch without location
 */
async function fetchRestaurantsSimple(): Promise<Restaurant[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('category', 'restaurant')
    .limit(RESTAURANTS_TO_FETCH);

  if (error) {
    console.error('Error fetching restaurants:', error);
    return [];
  }

  return (data || []).map((item) => parseRestaurant(item));
}

/**
 * Parse restaurant data from database format
 */
function parseRestaurant(item: any): Restaurant {
  const attributes = item.attributes || {};

  return {
    id: item.id,
    name: item.name,
    cuisine_type: attributes.cuisine_type,
    price_range: attributes.price_range,
    address: attributes.address,
    image_url: attributes.image_url || attributes.photo_url,
    latitude: attributes.latitude,
    longitude: attributes.longitude,
  };
}

/**
 * Save a restaurant rating during onboarding
 */
export async function saveRestaurantRating(
  userId: string,
  restaurantId: string,
  rating: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  try {
    // Check if rating already exists
    const { data: existingRating } = await supabase
      .from('user_ratings')
      .select('id')
      .eq('user_id', userId)
      .eq('item_id', restaurantId)
      .maybeSingle();

    if (existingRating) {
      // Update existing rating
      const { error } = await supabase
        .from('user_ratings')
        .update({
          rating,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingRating.id);

      if (error) {
        console.error('Error updating rating:', error);
        return { success: false, error: error.message };
      }
    } else {
      // Insert new rating
      const { error } = await supabase
        .from('user_ratings')
        .insert({
          user_id: userId,
          item_id: restaurantId,
          rating,
        });

      if (error) {
        console.error('Error inserting rating:', error);
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error saving rating:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get user's onboarding progress
 */
export async function getOnboardingProgress(
  userId: string
): Promise<OnboardingProgress> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('user_ratings')
      .select('id, rating')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching progress:', error);
      return {
        totalRestaurants: RESTAURANTS_TO_FETCH,
        ratedCount: 0,
        skippedCount: 0,
        isComplete: false,
      };
    }

    const ratedCount = data?.length || 0;
    const isComplete = ratedCount >= MINIMUM_RATINGS_REQUIRED;

    return {
      totalRestaurants: RESTAURANTS_TO_FETCH,
      ratedCount,
      skippedCount: 0,
      isComplete,
    };
  } catch (error) {
    console.error('Error in getOnboardingProgress:', error);
    return {
      totalRestaurants: RESTAURANTS_TO_FETCH,
      ratedCount: 0,
      skippedCount: 0,
      isComplete: false,
    };
  }
}

/**
 * Complete the onboarding process
 */
export async function completeOnboarding(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  try {
    // Check if user has enough ratings
    const progress = await getOnboardingProgress(userId);

    if (!progress.isComplete) {
      return {
        success: false,
        error: `Need at least ${MINIMUM_RATINGS_REQUIRED} ratings to complete onboarding`,
      };
    }

    // Update profile
    const { error } = await supabase
      .from('profiles')
      .update({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('Error completing onboarding:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in completeOnboarding:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if user needs to complete onboarding
 */
export async function needsOnboarding(userId: string): Promise<boolean> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error checking onboarding status:', error);
      return true;
    }

    return !data?.onboarding_completed;
  } catch (error) {
    console.error('Error in needsOnboarding:', error);
    return true;
  }
}
