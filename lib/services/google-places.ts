/**
 * Google Places API Integration Service
 *
 * Provides functions to fetch restaurant data from Google Places API
 * and populate the database with comprehensive information.
 */

import { supabase } from '@/lib/supabase/client';

const GOOGLE_PLACES_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
const PLACES_API_BASE = 'https://maps.googleapis.com/maps/api/place';

export interface PlaceSearchResult {
  place_id: string;
  name: string;
  vicinity: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  types: string[];
}

export interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  opening_hours?: {
    weekday_text: string[];
    open_now?: boolean;
  };
  types: string[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  reviews?: Array<{
    author_name: string;
    rating: number;
    text: string;
    time: number;
  }>;
}

/**
 * Search for places near a location
 */
export async function searchNearbyPlaces(
  latitude: number,
  longitude: number,
  radius: number = 5000,
  type: string = 'restaurant',
  keyword?: string
): Promise<{ results: PlaceSearchResult[]; error: Error | null }> {
  try {
    if (!GOOGLE_PLACES_API_KEY) {
      throw new Error('Google Places API key not configured');
    }

    const params = new URLSearchParams({
      location: `${latitude},${longitude}`,
      radius: radius.toString(),
      type,
      key: GOOGLE_PLACES_API_KEY,
    });

    if (keyword) {
      params.append('keyword', keyword);
    }

    const response = await fetch(`${PLACES_API_BASE}/nearbysearch/json?${params}`);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Places API error: ${data.status} - ${data.error_message || ''}`);
    }

    return { results: data.results || [], error: null };
  } catch (error) {
    console.error('Error searching nearby places:', error);
    return { results: [], error: error as Error };
  }
}

/**
 * Get detailed information about a specific place
 */
export async function getPlaceDetails(
  placeId: string
): Promise<{ details: PlaceDetails | null; error: Error | null }> {
  try {
    if (!GOOGLE_PLACES_API_KEY) {
      throw new Error('Google Places API key not configured');
    }

    const params = new URLSearchParams({
      place_id: placeId,
      fields: 'place_id,name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,price_level,opening_hours,types,geometry,reviews',
      key: GOOGLE_PLACES_API_KEY,
    });

    const response = await fetch(`${PLACES_API_BASE}/details/json?${params}`);
    const data = await response.json();

    if (data.status !== 'OK') {
      throw new Error(`Google Places API error: ${data.status} - ${data.error_message || ''}`);
    }

    return { details: data.result, error: null };
  } catch (error) {
    console.error('Error getting place details:', error);
    return { details: null, error: error as Error };
  }
}

/**
 * Map price level to price range string
 */
function mapPriceLevel(priceLevel?: number): string {
  if (!priceLevel) return '$';
  const map: Record<number, string> = {
    1: '$',
    2: '$$',
    3: '$$$',
    4: '$$$$',
  };
  return map[priceLevel] || '$';
}

/**
 * Extract cuisine type from Google Place types
 */
function extractCuisineType(types: string[]): string {
  const cuisineMap: Record<string, string> = {
    'italian_restaurant': 'Italian',
    'chinese_restaurant': 'Chinese',
    'japanese_restaurant': 'Japanese',
    'mexican_restaurant': 'Mexican',
    'indian_restaurant': 'Indian',
    'thai_restaurant': 'Thai',
    'french_restaurant': 'French',
    'american_restaurant': 'American',
    'greek_restaurant': 'Greek',
    'spanish_restaurant': 'Spanish',
    'vietnamese_restaurant': 'Vietnamese',
    'korean_restaurant': 'Korean',
    'mediterranean_restaurant': 'Mediterranean',
    'seafood_restaurant': 'Seafood',
    'steak_house': 'Steakhouse',
    'pizza_restaurant': 'Pizza',
    'fast_food_restaurant': 'Fast Food',
    'cafe': 'Cafe',
    'bakery': 'Bakery',
    'bar': 'Bar & Grill',
  };

  for (const type of types) {
    if (cuisineMap[type]) {
      return cuisineMap[type];
    }
  }

  return 'American';
}

/**
 * Store restaurant data in database
 */
export async function storeRestaurant(
  placeDetails: PlaceDetails
): Promise<{ itemId: string | null; error: Error | null }> {
  try {
    const { data: existingItem } = await supabase
      .from('items')
      .select('id')
      .eq('external_id', placeDetails.place_id)
      .eq('external_source', 'google_places')
      .maybeSingle();

    const cuisineType = extractCuisineType(placeDetails.types);
    const priceRange = mapPriceLevel(placeDetails.price_level);

    const itemData = {
      category: 'restaurant',
      category_type: 'restaurant',
      name: placeDetails.name,
      external_id: placeDetails.place_id,
      external_source: 'google_places',
      verified: true,
      last_synced_at: new Date().toISOString(),
      location: `POINT(${placeDetails.geometry.location.lng} ${placeDetails.geometry.location.lat})`,
      attributes: {
        cuisine_type: cuisineType,
        price_range: priceRange,
        address: placeDetails.formatted_address,
        phone: placeDetails.formatted_phone_number,
        website: placeDetails.website,
        google_rating: placeDetails.rating,
        google_review_count: placeDetails.user_ratings_total,
        hours: placeDetails.opening_hours?.weekday_text || [],
        open_now: placeDetails.opening_hours?.open_now,
        google_place_id: placeDetails.place_id,
      },
    };

    if (existingItem) {
      const { error } = await supabase
        .from('items')
        .update(itemData as any)
        .eq('id', existingItem.id);

      if (error) throw error;
      return { itemId: existingItem.id, error: null };
    } else {
      const { data, error } = await supabase
        .from('items')
        .insert(itemData as any)
        .select('id')
        .single();

      if (error) throw error;
      return { itemId: data?.id || null, error: null };
    }
  } catch (error) {
    console.error('Error storing restaurant:', error);
    return { itemId: null, error: error as Error };
  }
}

/**
 * Populate database with restaurants from a specific area
 */
export async function populateRestaurants(
  centerLat: number,
  centerLon: number,
  radiusKm: number = 10,
  maxResults: number = 500
): Promise<{
  imported: number;
  updated: number;
  failed: number;
  errors: string[];
}> {
  const results = {
    imported: 0,
    updated: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    const radiusMeters = radiusKm * 1000;
    let allPlaces: PlaceSearchResult[] = [];

    const { results: places, error } = await searchNearbyPlaces(
      centerLat,
      centerLon,
      radiusMeters,
      'restaurant'
    );

    if (error) {
      results.errors.push(error.message);
      return results;
    }

    allPlaces = places;

    console.log(`Found ${allPlaces.length} restaurants to process`);

    for (let i = 0; i < Math.min(allPlaces.length, maxResults); i++) {
      const place = allPlaces[i];

      try {
        await new Promise(resolve => setTimeout(resolve, 100));

        const { details, error: detailsError } = await getPlaceDetails(place.place_id);

        if (detailsError || !details) {
          results.failed++;
          results.errors.push(`Failed to get details for ${place.name}: ${detailsError?.message || 'Unknown error'}`);
          continue;
        }

        const { data: existing } = await supabase
          .from('items')
          .select('id')
          .eq('external_id', place.place_id)
          .maybeSingle();

        const { itemId, error: storeError } = await storeRestaurant(details);

        if (storeError) {
          results.failed++;
          results.errors.push(`Failed to store ${place.name}: ${storeError.message}`);
        } else if (existing) {
          results.updated++;
        } else {
          results.imported++;
        }

        if ((i + 1) % 10 === 0) {
          console.log(`Processed ${i + 1}/${Math.min(allPlaces.length, maxResults)} restaurants`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Error processing ${place.name}: ${(error as Error).message}`);
      }
    }
  } catch (error) {
    results.errors.push(`Fatal error: ${(error as Error).message}`);
  }

  return results;
}

/**
 * Search restaurants with filters
 */
export async function searchRestaurants(params: {
  query?: string;
  latitude?: number;
  longitude?: number;
  maxDistanceKm?: number;
  cuisineType?: string;
  priceRange?: string;
  minRating?: number;
  limit?: number;
  offset?: number;
}): Promise<{ restaurants: any[]; error: Error | null }> {
  try {
    const filters: Record<string, any> = {};

    if (params.cuisineType) filters.cuisine_type = params.cuisineType;
    if (params.priceRange) filters.price_range = params.priceRange;
    if (params.minRating) filters.min_rating = params.minRating;

    const { data, error } = await supabase.rpc('search_items', {
      p_category: 'restaurant',
      p_query: params.query || null,
      p_location_lat: params.latitude || null,
      p_location_lon: params.longitude || null,
      p_max_distance_km: params.maxDistanceKm || 50,
      p_filters: filters,
      p_limit: params.limit || 20,
      p_offset: params.offset || 0,
    });

    if (error) throw error;

    return { restaurants: data || [], error: null };
  } catch (error) {
    console.error('Error searching restaurants:', error);
    return { restaurants: [], error: error as Error };
  }
}
