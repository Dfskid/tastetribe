/**
 * Restaurant Service
 *
 * Handles all restaurant-related queries including spatial searches,
 * filtering, and data retrieval optimized for onboarding and recommendations.
 */

import { supabase } from '@/lib/supabase/client';
import { Item, RestaurantAttributes } from '@/lib/supabase/types';
import { GeolocationCoordinates } from './geolocation';

export interface Restaurant extends Item {
  distance?: number;
  distanceFormatted?: string;
  distance_meters?: number;
}

export interface RestaurantQueryOptions {
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  limit?: number;
  excludeIds?: string[];
  minRating?: number;
}

/**
 * Find nearby restaurants using Supabase spatial function
 */
export async function findNearbyRestaurants(
  options: RestaurantQueryOptions
): Promise<{ restaurants: Restaurant[]; error: Error | null }> {
  try {
    const {
      latitude,
      longitude,
      radiusMeters = 10000,
      limit = 15,
      excludeIds = [],
      minRating,
    } = options;

    const { data, error } = await supabase.rpc('find_nearby_restaurants', {
      user_lat: latitude,
      user_lon: longitude,
      radius_meters: radiusMeters,
      limit_count: limit,
    });

    if (error) throw error;

    if (!data || data.length === 0) {
      return { restaurants: [], error: null };
    }

    // Filter and format results
    let restaurants = data
      .filter((item: any) => !excludeIds.includes(item.id))
      .map((item: any) => ({
        ...item,
        distance: item.distance_meters,
        distanceFormatted: formatDistance(item.distance_meters),
      }));

    // Apply minimum rating filter if specified
    if (minRating !== undefined) {
      restaurants = restaurants.filter((r: any) => {
        const rating = r.attributes?.google_rating;
        return rating && rating >= minRating;
      });
    }

    return { restaurants, error: null };
  } catch (error) {
    console.error('Error finding nearby restaurants:', error);
    return {
      restaurants: [],
      error: error as Error,
    };
  }
}

/**
 * Get restaurants for onboarding flow
 * Ensures variety in cuisine types and price ranges
 */
export async function getOnboardingRestaurants(
  coordinates: GeolocationCoordinates,
  count: number = 12
): Promise<{ restaurants: Restaurant[]; error: Error | null }> {
  try {
    // Get a larger pool to ensure variety
    const { restaurants, error } = await findNearbyRestaurants({
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      radiusMeters: 15000, // 15km radius for better variety
      limit: count * 2,
    });

    if (error) return { restaurants: [], error };

    if (restaurants.length === 0) {
      return {
        restaurants: [],
        error: new Error('No restaurants found in your area'),
      };
    }

    // Ensure variety by selecting diverse restaurants
    const diverseRestaurants = selectDiverseRestaurants(restaurants, count);

    return { restaurants: diverseRestaurants, error: null };
  } catch (error) {
    console.error('Error getting onboarding restaurants:', error);
    return {
      restaurants: [],
      error: error as Error,
    };
  }
}

/**
 * Select diverse set of restaurants for better taste profile building
 * Prioritizes variety in cuisine type and price range
 */
function selectDiverseRestaurants(
  restaurants: Restaurant[],
  count: number
): Restaurant[] {
  if (restaurants.length <= count) {
    return restaurants;
  }

  const selected: Restaurant[] = [];
  const cuisinesSeen = new Set<string>();
  const pricesSeen = new Set<string>();

  // First pass: select one from each cuisine type
  for (const restaurant of restaurants) {
    if (selected.length >= count) break;

    const attrs = restaurant.attributes as RestaurantAttributes;
    const cuisine = attrs.cuisine_type?.toLowerCase() || 'unknown';
    const price = attrs.price_range || '$$';

    if (!cuisinesSeen.has(cuisine)) {
      selected.push(restaurant);
      cuisinesSeen.add(cuisine);
      pricesSeen.add(price);
    }
  }

  // Second pass: fill remaining slots with variety in price range
  if (selected.length < count) {
    for (const restaurant of restaurants) {
      if (selected.length >= count) break;
      if (selected.includes(restaurant)) continue;

      const attrs = restaurant.attributes as RestaurantAttributes;
      const price = attrs.price_range || '$$';

      if (!pricesSeen.has(price) || selected.length < count - 2) {
        selected.push(restaurant);
        pricesSeen.add(price);
      }
    }
  }

  // Third pass: fill any remaining slots with highest-rated restaurants
  if (selected.length < count) {
    const remaining = restaurants
      .filter(r => !selected.includes(r))
      .sort((a, b) => {
        const ratingA = (a.attributes as RestaurantAttributes).google_rating || 0;
        const ratingB = (b.attributes as RestaurantAttributes).google_rating || 0;
        return ratingB - ratingA;
      });

    selected.push(...remaining.slice(0, count - selected.length));
  }

  return selected;
}

/**
 * Get restaurant by ID
 */
export async function getRestaurantById(
  id: string
): Promise<{ restaurant: Restaurant | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('id', id)
      .eq('category', 'restaurant')
      .maybeSingle();

    if (error) throw error;

    return { restaurant: data as Restaurant, error: null };
  } catch (error) {
    console.error('Error getting restaurant:', error);
    return { restaurant: null, error: error as Error };
  }
}

/**
 * Search restaurants by name or cuisine
 */
export async function searchRestaurants(
  query: string,
  coordinates?: GeolocationCoordinates,
  limit: number = 20
): Promise<{ restaurants: Restaurant[]; error: Error | null }> {
  try {
    let queryBuilder = supabase
      .from('items')
      .select('*')
      .eq('category', 'restaurant')
      .or(`name.ilike.%${query}%,attributes->>cuisine_type.ilike.%${query}%`)
      .limit(limit);

    const { data, error } = await queryBuilder;

    if (error) throw error;

    let restaurants = (data || []) as Restaurant[];

    // Add distance if coordinates provided
    if (coordinates && restaurants.length > 0) {
      restaurants = restaurants.map(r => {
        const attrs = r.attributes as RestaurantAttributes;
        if (attrs.latitude && attrs.longitude) {
          const distance = calculateDistanceSimple(
            coordinates.latitude,
            coordinates.longitude,
            attrs.latitude,
            attrs.longitude
          );
          return {
            ...r,
            distance,
            distanceFormatted: formatDistance(distance),
          };
        }
        return r;
      });

      // Sort by distance
      restaurants.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
    }

    return { restaurants, error: null };
  } catch (error) {
    console.error('Error searching restaurants:', error);
    return { restaurants: [], error: error as Error };
  }
}

/**
 * Simple distance calculation (Haversine formula)
 */
function calculateDistanceSimple(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Format distance for display
 */
function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * Get restaurant statistics for a user's ratings
 */
export async function getUserRestaurantStats(
  userId: string
): Promise<{
  totalRated: number;
  averageRating: number;
  favoriteCuisines: { name: string; count: number }[];
  error: Error | null;
}> {
  try {
    const { data: ratings, error } = await supabase
      .from('user_ratings')
      .select('rating, item_id, items!inner(attributes)')
      .eq('user_id', userId);

    if (error) throw error;

    const totalRated = ratings?.length || 0;
    const averageRating = totalRated > 0
      ? ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / totalRated
      : 0;

    // Count cuisines
    const cuisineCounts: Record<string, number> = {};
    ratings?.forEach((r: any) => {
      const cuisine = r.items?.attributes?.cuisine_type;
      if (cuisine) {
        cuisineCounts[cuisine] = (cuisineCounts[cuisine] || 0) + 1;
      }
    });

    const favoriteCuisines = Object.entries(cuisineCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalRated,
      averageRating,
      favoriteCuisines,
      error: null,
    };
  } catch (error) {
    console.error('Error getting restaurant stats:', error);
    return {
      totalRated: 0,
      averageRating: 0,
      favoriteCuisines: [],
      error: error as Error,
    };
  }
}
