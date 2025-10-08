/**
 * Restaurant Data Population Script
 *
 * This script populates the database with restaurant data from Google Places API.
 * Run with: npx tsx scripts/populate-restaurants.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GOOGLE_PLACES_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Denver coordinates and surrounding areas
const DENVER_AREAS = [
  { name: 'Downtown Denver', lat: 39.7392, lon: -104.9903 },
  { name: 'Capitol Hill', lat: 39.7294, lon: -104.9806 },
  { name: 'LoDo', lat: 39.7539, lon: -105.0006 },
  { name: 'Cherry Creek', lat: 39.7172, lon: -104.9536 },
  { name: 'Highlands', lat: 39.7650, lon: -105.0094 },
  { name: 'RiNo', lat: 39.7653, lon: -104.9811 },
  { name: 'Washington Park', lat: 39.7036, lon: -104.9664 },
  { name: 'Five Points', lat: 39.7611, lon: -104.9747 },
];

interface PlaceSearchResult {
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

interface PlaceDetails {
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
}

async function searchNearbyPlaces(
  latitude: number,
  longitude: number,
  radius: number = 5000
): Promise<PlaceSearchResult[]> {
  const params = new URLSearchParams({
    location: `${latitude},${longitude}`,
    radius: radius.toString(),
    type: 'restaurant',
    key: GOOGLE_PLACES_API_KEY,
  });

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`
  );
  const data = await response.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places API error: ${data.status}`);
  }

  return data.results || [];
}

async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const params = new URLSearchParams({
    place_id: placeId,
    fields:
      'place_id,name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,price_level,opening_hours,types,geometry',
    key: GOOGLE_PLACES_API_KEY,
  });

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?${params}`
  );
  const data = await response.json();

  if (data.status !== 'OK') {
    return null;
  }

  return data.result;
}

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

function extractCuisineType(types: string[]): string {
  const cuisineMap: Record<string, string> = {
    italian_restaurant: 'Italian',
    chinese_restaurant: 'Chinese',
    japanese_restaurant: 'Japanese',
    mexican_restaurant: 'Mexican',
    indian_restaurant: 'Indian',
    thai_restaurant: 'Thai',
    french_restaurant: 'French',
    american_restaurant: 'American',
    greek_restaurant: 'Greek',
    spanish_restaurant: 'Spanish',
    vietnamese_restaurant: 'Vietnamese',
    korean_restaurant: 'Korean',
    mediterranean_restaurant: 'Mediterranean',
    seafood_restaurant: 'Seafood',
    steak_house: 'Steakhouse',
    pizza_restaurant: 'Pizza',
    fast_food_restaurant: 'Fast Food',
    cafe: 'Cafe',
    bakery: 'Bakery',
    bar: 'Bar & Grill',
  };

  for (const type of types) {
    if (cuisineMap[type]) {
      return cuisineMap[type];
    }
  }

  return 'American';
}

async function storeRestaurant(placeDetails: PlaceDetails): Promise<boolean> {
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
        .update(itemData)
        .eq('id', existingItem.id);

      return !error;
    } else {
      const { error } = await supabase.from('items').insert(itemData);

      return !error;
    }
  } catch (error) {
    console.error('Error storing restaurant:', error);
    return false;
  }
}

async function main() {
  console.log('Starting restaurant population...\n');

  if (!GOOGLE_PLACES_API_KEY) {
    console.error('Error: NEXT_PUBLIC_GOOGLE_PLACES_API_KEY not set');
    process.exit(1);
  }

  let totalImported = 0;
  let totalUpdated = 0;
  let totalFailed = 0;
  const processedPlaceIds = new Set<string>();

  for (const area of DENVER_AREAS) {
    console.log(`\nProcessing area: ${area.name}`);

    try {
      const places = await searchNearbyPlaces(area.lat, area.lon, 5000);
      console.log(`Found ${places.length} restaurants in ${area.name}`);

      for (const place of places) {
        if (processedPlaceIds.has(place.place_id)) {
          continue;
        }

        processedPlaceIds.add(place.place_id);

        try {
          await new Promise((resolve) => setTimeout(resolve, 150));

          const details = await getPlaceDetails(place.place_id);

          if (!details) {
            totalFailed++;
            continue;
          }

          const { data: existing } = await supabase
            .from('items')
            .select('id')
            .eq('external_id', place.place_id)
            .maybeSingle();

          const success = await storeRestaurant(details);

          if (success) {
            if (existing) {
              totalUpdated++;
            } else {
              totalImported++;
            }

            if ((totalImported + totalUpdated) % 10 === 0) {
              console.log(
                `Progress: ${totalImported} imported, ${totalUpdated} updated, ${totalFailed} failed`
              );
            }
          } else {
            totalFailed++;
          }
        } catch (error) {
          console.error(`Error processing ${place.name}:`, error);
          totalFailed++;
        }
      }
    } catch (error) {
      console.error(`Error processing area ${area.name}:`, error);
    }
  }

  console.log('\n=== Population Summary ===');
  console.log(`Total imported: ${totalImported}`);
  console.log(`Total updated: ${totalUpdated}`);
  console.log(`Total failed: ${totalFailed}`);
  console.log(`Total processed: ${totalImported + totalUpdated + totalFailed}`);
}

main().catch(console.error);
