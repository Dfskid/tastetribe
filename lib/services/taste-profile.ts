/**
 * Taste Profile Service
 *
 * Fetches and processes user rating data for the taste profile dashboard
 */

import { createClient } from '@/lib/supabase/client';

export interface CuisineStats {
  cuisine: string;
  count: number;
}

export interface CategoryRatings {
  category: string;
  average: number;
}

export interface TopRestaurant {
  id: string;
  name: string;
  rating: number;
  cuisine?: string;
  imageUrl?: string;
  totalRatings: number;
}

export interface TasteProfileData {
  totalRatings: number;
  cuisineStats: CuisineStats[];
  categoryRatings: CategoryRatings[];
  topRestaurants: TopRestaurant[];
  averageRating: number;
}

/**
 * Fetch comprehensive taste profile data for a user
 */
export async function fetchTasteProfile(userId: string): Promise<TasteProfileData> {
  const supabase = createClient();

  try {
    // Fetch all user ratings with restaurant details
    const { data: ratings, error } = await supabase
      .from('user_ratings')
      .select(`
        id,
        rating,
        rating_details,
        created_at,
        item_id,
        items!inner(
          id,
          name,
          category,
          attributes
        )
      `)
      .eq('user_id', userId)
      .order('rating', { ascending: false });

    if (error) {
      console.error('Error fetching taste profile:', error);
      return getEmptyProfile();
    }

    if (!ratings || ratings.length === 0) {
      return getEmptyProfile();
    }

    // Process cuisine statistics
    const cuisineMap = new Map<string, number>();
    ratings.forEach((rating: any) => {
      const cuisine = rating.items?.attributes?.cuisine_type || 'Other';
      cuisineMap.set(cuisine, (cuisineMap.get(cuisine) || 0) + 1);
    });

    const cuisineStats = Array.from(cuisineMap.entries())
      .map(([cuisine, count]) => ({ cuisine, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8); // Top 8 cuisines

    // Process category ratings from rating_details
    const categoryMap = new Map<string, number[]>();
    const categoryNames = ['Food Quality', 'Service', 'Value', 'Ambiance'];

    ratings.forEach((rating: any) => {
      const details = rating.rating_details;
      if (details && details.tags && Array.isArray(details.tags)) {
        details.tags.forEach((tag: string) => {
          if (categoryNames.includes(tag)) {
            if (!categoryMap.has(tag)) {
              categoryMap.set(tag, []);
            }
            categoryMap.get(tag)!.push(rating.rating);
          }
        });
      }
    });

    const categoryRatings = categoryNames.map((category) => {
      const ratings = categoryMap.get(category) || [];
      const average = ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : 0;
      return { category, average: Math.round(average * 10) / 10 };
    });

    // Get top 5 restaurants
    const restaurantMap = new Map<string, any>();
    ratings.forEach((rating: any) => {
      const restaurantId = rating.items?.id;
      if (!restaurantId) return;

      if (!restaurantMap.has(restaurantId)) {
        restaurantMap.set(restaurantId, {
          id: restaurantId,
          name: rating.items.name,
          cuisine: rating.items.attributes?.cuisine_type,
          imageUrl: rating.items.attributes?.image_url || rating.items.attributes?.photo_url,
          ratings: [],
        });
      }
      restaurantMap.get(restaurantId).ratings.push(rating.rating);
    });

    const topRestaurants = Array.from(restaurantMap.values())
      .map((restaurant) => ({
        id: restaurant.id,
        name: restaurant.name,
        cuisine: restaurant.cuisine,
        imageUrl: restaurant.imageUrl,
        rating: restaurant.ratings.reduce((sum: number, r: number) => sum + r, 0) / restaurant.ratings.length,
        totalRatings: restaurant.ratings.length,
      }))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5);

    // Calculate average rating
    const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

    return {
      totalRatings: ratings.length,
      cuisineStats,
      categoryRatings,
      topRestaurants,
      averageRating: Math.round(averageRating * 10) / 10,
    };
  } catch (error) {
    console.error('Error processing taste profile:', error);
    return getEmptyProfile();
  }
}

function getEmptyProfile(): TasteProfileData {
  return {
    totalRatings: 0,
    cuisineStats: [],
    categoryRatings: [
      { category: 'Food Quality', average: 0 },
      { category: 'Service', average: 0 },
      { category: 'Value', average: 0 },
      { category: 'Ambiance', average: 0 },
    ],
    topRestaurants: [],
    averageRating: 0,
  };
}
