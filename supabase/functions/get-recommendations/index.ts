import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface TasteProfile {
  cuisine_preferences: Record<string, number>;
  price_preferences: Record<string, number>;
  attribute_weights: Record<string, number>;
  rated_items: string[];
  last_updated: string | null;
}

interface RestaurantAttributes {
  cuisine_type?: string;
  price_range?: string;
  google_rating?: number;
  latitude?: number;
  longitude?: number;
  [key: string]: any;
}

interface Restaurant {
  id: string;
  name: string;
  category: string;
  attributes: RestaurantAttributes;
  distance_meters: number;
}

interface CachedRecommendations {
  recommendations: any[];
  metadata: any;
  created_at: string;
  expires_at: string;
}

const CACHE_TTL_HOURS = 1;
const LOCATION_MOVEMENT_THRESHOLD_KM = 5;

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function checkCache(
  supabase: any,
  userId: string,
  category: string,
  latitude: number,
  longitude: number
): Promise<CachedRecommendations | null> {
  const { data, error } = await supabase
    .from('recommendation_cache')
    .select('*')
    .eq('user_id', userId)
    .eq('category', category)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  if (data.location_lat && data.location_lon) {
    const distance = calculateDistance(
      latitude,
      longitude,
      data.location_lat,
      data.location_lon
    );
    if (distance > LOCATION_MOVEMENT_THRESHOLD_KM) {
      return null;
    }
  }

  await supabase
    .from('recommendation_cache')
    .update({
      last_accessed: new Date().toISOString(),
      access_count: data.access_count + 1,
    })
    .eq('id', data.id);

  return {
    recommendations: data.recommendations,
    metadata: data.metadata,
    created_at: data.created_at,
    expires_at: data.expires_at,
  };
}

async function saveCache(
  supabase: any,
  userId: string,
  category: string,
  latitude: number,
  longitude: number,
  recommendations: any[],
  metadata: any
): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + CACHE_TTL_HOURS);

  await supabase
    .from('recommendation_cache')
    .insert({
      user_id: userId,
      category,
      location_lat: latitude,
      location_lon: longitude,
      recommendations,
      metadata,
      expires_at: expiresAt.toISOString(),
    });
}

function calculateCosineSimilarity(vec1: Record<string, number>, vec2: Record<string, number>): number {
  const keys = new Set([...Object.keys(vec1), ...Object.keys(vec2)]);
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;

  keys.forEach((key) => {
    const v1 = vec1[key] || 0;
    const v2 = vec2[key] || 0;
    dotProduct += v1 * v2;
    mag1 += v1 * v1;
    mag2 += v2 * v2;
  });

  const magnitude = Math.sqrt(mag1) * Math.sqrt(mag2);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

function calculateRecommendationScore(
  restaurant: Restaurant,
  userTasteProfile: TasteProfile,
  friendsProfiles: TasteProfile[],
  userLocation: { lat: number; lon: number }
): { score: number; breakdown: any } {
  const attrs: RestaurantAttributes = restaurant.attributes;
  let baseScore = 0;
  let socialScore = 0;
  let locationScore = 0;
  let popularityScore = 0;

  if (Object.keys(userTasteProfile.cuisine_preferences).length > 0) {
    const cuisineMatch = attrs.cuisine_type
      ? userTasteProfile.cuisine_preferences[attrs.cuisine_type.toLowerCase()] || 0
      : 0;

    const priceMatch = attrs.price_range
      ? userTasteProfile.price_preferences[attrs.price_range] || 0
      : 0;

    baseScore = (cuisineMatch * 2.5 + priceMatch * 1.5) * 0.4;
  }

  if (friendsProfiles.length > 0) {
    let friendMatchScore = 0;
    friendsProfiles.forEach((friendProfile) => {
      const cuisineSim = attrs.cuisine_type
        ? calculateCosineSimilarity(
            userTasteProfile.cuisine_preferences,
            friendProfile.cuisine_preferences
          )
        : 0;

      friendMatchScore += cuisineSim;
    });

    socialScore = (friendMatchScore / friendsProfiles.length) * 2 * 0.3;
  }

  if (restaurant.distance_meters) {
    const maxDistance = 15000;
    const distanceRatio = Math.max(0, 1 - (restaurant.distance_meters / maxDistance));
    locationScore = distanceRatio * 0.2;
  }

  if (attrs.google_rating) {
    popularityScore = (attrs.google_rating / 5) * 0.1;
  }

  const totalScore = baseScore + socialScore + locationScore + popularityScore;

  return {
    score: totalScore,
    breakdown: {
      personal_taste: baseScore,
      social_match: socialScore,
      location_proximity: locationScore,
      popularity: popularityScore,
      has_friend_match: socialScore > 0,
      distance_km: restaurant.distance_meters ? (restaurant.distance_meters / 1000).toFixed(1) : null,
    },
  };
}

async function getFallbackRecommendations(
  supabase: any,
  category: string,
  latitude: number,
  longitude: number,
  limit: number,
  excludeIds: string[]
): Promise<any[]> {
  const { data: trending } = await supabase
    .from('trending_items')
    .select(`
      *,
      items:item_id (
        id,
        name,
        category,
        attributes,
        location
      )
    `)
    .eq('category', category)
    .order('trending_score', { ascending: false })
    .limit(limit);

  if (trending && trending.length > 0) {
    return trending
      .filter((t: any) => !excludeIds.includes(t.item_id))
      .map((t: any) => ({
        ...t.items,
        recommendation_score: t.trending_score * 0.5,
        is_fallback: true,
        fallback_reason: 'trending',
      }))
      .slice(0, limit);
  }

  const { data: nearby } = await supabase.rpc('find_nearby_restaurants', {
    user_lat: latitude,
    user_lon: longitude,
    radius_meters: 15000,
    limit_count: limit,
  });

  return (nearby || [])
    .filter((r: any) => !excludeIds.includes(r.id))
    .map((r: any) => ({
      ...r,
      recommendation_score: 0.3,
      is_fallback: true,
      fallback_reason: 'nearby',
    }));
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category') || 'restaurant';
    const latitude = parseFloat(searchParams.get('latitude') || '39.7392');
    const longitude = parseFloat(searchParams.get('longitude') || '-104.9903');
    const radius = parseFloat(searchParams.get('radius') || '15000');
    const forceRefresh = searchParams.get('force_refresh') === 'true';

    if (!forceRefresh) {
      const cached = await checkCache(supabase, user.id, category, latitude, longitude);
      if (cached) {
        return new Response(
          JSON.stringify({
            ...cached,
            from_cache: true,
            cache_age_minutes: Math.floor(
              (Date.now() - new Date(cached.created_at).getTime()) / 60000
            ),
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('taste_profile')
      .eq('id', user.id)
      .single();

    const userTasteProfile: TasteProfile = profile?.taste_profile || {
      cuisine_preferences: {},
      price_preferences: {},
      attribute_weights: {},
      rated_items: [],
      last_updated: null,
    };

    const { data: friends } = await supabase.rpc('get_user_friends', {
      user_uuid: user.id,
    });

    const friendIds = friends?.map((f: any) => f.friend_id) || [];

    let friendsProfiles: TasteProfile[] = [];
    if (friendIds.length > 0) {
      const { data: friendsData } = await supabase
        .from('profiles')
        .select('taste_profile')
        .in('id', friendIds);

      friendsProfiles = friendsData?.map((p: any) => p.taste_profile).filter(Boolean) || [];
    }

    const { data: restaurants } = await supabase.rpc('find_nearby_restaurants', {
      user_lat: latitude,
      user_lon: longitude,
      radius_meters: radius,
      limit_count: limit * 3,
    });

    const hasTasteData = Object.keys(userTasteProfile.cuisine_preferences).length > 0;

    let recommendations: any[] = [];
    const metadata = {
      total_candidates: 0,
      friend_count: friendIds.length,
      has_taste_profile: hasTasteData,
      location: { latitude, longitude },
      algorithm_version: '2.0',
      used_fallback: false,
    };

    if (!restaurants || restaurants.length === 0) {
      recommendations = await getFallbackRecommendations(
        supabase,
        category,
        latitude,
        longitude,
        limit,
        userTasteProfile.rated_items
      );
      metadata.used_fallback = true;
      metadata.total_candidates = recommendations.length;
    } else {
      const unratedRestaurants = restaurants.filter(
        (r: Restaurant) => !userTasteProfile.rated_items.includes(r.id)
      );

      metadata.total_candidates = unratedRestaurants.length;

      if (unratedRestaurants.length === 0) {
        recommendations = await getFallbackRecommendations(
          supabase,
          category,
          latitude,
          longitude,
          limit,
          userTasteProfile.rated_items
        );
        metadata.used_fallback = true;
      } else {
        const scoredRestaurants = unratedRestaurants.map((restaurant: Restaurant) => {
          const { score, breakdown } = calculateRecommendationScore(
            restaurant,
            userTasteProfile,
            friendsProfiles,
            { lat: latitude, lon: longitude }
          );

          return {
            ...restaurant,
            recommendation_score: score,
            score_breakdown: breakdown,
          };
        });

        recommendations = scoredRestaurants
          .sort((a, b) => b.recommendation_score - a.recommendation_score)
          .slice(0, limit);

        if (recommendations.length < limit && !hasTasteData) {
          const fallbackRecs = await getFallbackRecommendations(
            supabase,
            category,
            latitude,
            longitude,
            limit - recommendations.length,
            [...userTasteProfile.rated_items, ...recommendations.map(r => r.id)]
          );
          recommendations = [...recommendations, ...fallbackRecs];
          metadata.used_fallback = true;
        }
      }
    }

    await saveCache(supabase, user.id, category, latitude, longitude, recommendations, metadata);

    return new Response(
      JSON.stringify({
        recommendations,
        metadata,
        from_cache: false,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Recommendation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});