import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * Enhanced Recommendation Engine
 *
 * Implements a sophisticated taste-based recommendation algorithm using:
 * 1. Taste vector generation from user ratings and tags
 * 2. Cosine similarity calculations between users and items
 * 3. Friend taste similarity ranking ("taste twins")
 * 4. Blended recommendation scoring (30% personal + 70% friends)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Configuration
const MIN_TASTE_TWIN_SIMILARITY = 0.3;
const PERSONAL_WEIGHT = 0.3;
const FRIENDS_WEIGHT = 0.7;
const TOP_RECOMMENDATIONS = 20;
const MIN_RATINGS_FOR_VECTOR = 3;

interface Rating {
  item_id: string;
  rating: number;
  rating_details?: {
    tags?: string[];
  };
  items?: {
    id: string;
    name: string;
    category: string;
    attributes: any;
  };
}

interface TasteVector {
  [key: string]: number;
}

interface UserProfile {
  userId: string;
  ratings: Rating[];
  tasteVector: TasteVector;
}

interface TasteTwin {
  userId: string;
  similarity: number;
  ratings: Rating[];
}

interface Recommendation {
  item_id: string;
  item_name: string;
  category: string;
  score: number;
  personal_score: number;
  friends_score: number;
  taste_twins_count: number;
  attributes: any;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Parse request
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating recommendations for user: ${userId}`);

    // Step 1: Fetch user's ratings and friends
    const [userRatingsResult, friendsResult] = await Promise.all([
      supabase
        .from("user_ratings")
        .select("item_id, rating, rating_details, items!inner(id, name, category, attributes)")
        .eq("user_id", userId),
      supabase
        .from("friendships")
        .select("friend_id")
        .eq("user_id", userId)
        .eq("status", "accepted"),
    ]);

    if (userRatingsResult.error) throw userRatingsResult.error;
    if (friendsResult.error) throw friendsResult.error;

    const userRatings = userRatingsResult.data as Rating[];
    const friendIds = friendsResult.data.map((f: any) => f.friend_id);

    // Edge case: User has insufficient ratings
    if (userRatings.length < MIN_RATINGS_FOR_VECTOR) {
      return new Response(
        JSON.stringify({
          recommendations: [],
          message: `Need at least ${MIN_RATINGS_FOR_VECTOR} ratings for personalized recommendations`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Generate user's taste vector
    const userProfile = createUserProfile(userId, userRatings);

    // Step 3: Fetch friends' ratings and generate their taste vectors
    let tasteTwins: TasteTwin[] = [];

    if (friendIds.length > 0) {
      const friendsRatingsResult = await supabase
        .from("user_ratings")
        .select("user_id, item_id, rating, rating_details, items!inner(id, name, category, attributes)")
        .in("user_id", friendIds);

      if (!friendsRatingsResult.error && friendsRatingsResult.data) {
        const friendsRatingsMap = new Map<string, Rating[]>();

        friendsRatingsResult.data.forEach((rating: any) => {
          if (!friendsRatingsMap.has(rating.user_id)) {
            friendsRatingsMap.set(rating.user_id, []);
          }
          friendsRatingsMap.get(rating.user_id)!.push(rating as Rating);
        });

        // Calculate similarity with each friend
        tasteTwins = Array.from(friendsRatingsMap.entries())
          .map(([friendId, ratings]) => {
            if (ratings.length < MIN_RATINGS_FOR_VECTOR) return null;

            const friendProfile = createUserProfile(friendId, ratings);
            const similarity = calculateCosineSimilarity(
              userProfile.tasteVector,
              friendProfile.tasteVector
            );

            return {
              userId: friendId,
              similarity,
              ratings,
            };
          })
          .filter((twin): twin is TasteTwin =>
            twin !== null && twin.similarity >= MIN_TASTE_TWIN_SIMILARITY
          )
          .sort((a, b) => b.similarity - a.similarity);
      }
    }

    console.log(`Found ${tasteTwins.length} taste twins`);

    // Step 4: Get all unrated items
    const ratedItemIds = userRatings.map((r) => r.item_id);
    const unratedItemsResult = await supabase
      .from("items")
      .select("*")
      .eq("category", "restaurant")
      .not("id", "in", `(${ratedItemIds.join(",")})`);

    if (unratedItemsResult.error) throw unratedItemsResult.error;

    const unratedItems = unratedItemsResult.data || [];

    // Step 5: Calculate recommendations
    const recommendations = calculateRecommendations(
      userProfile,
      tasteTwins,
      unratedItems
    );

    return new Response(
      JSON.stringify({
        recommendations: recommendations.slice(0, TOP_RECOMMENDATIONS),
        taste_twins_count: tasteTwins.length,
        user_ratings_count: userRatings.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating recommendations:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Creates a user profile with taste vector
 *
 * Taste vector includes:
 * - Ratings for each item (normalized)
 * - Tag preferences (frequency-based weights)
 * - Cuisine preferences (from rated items)
 */
function createUserProfile(userId: string, ratings: Rating[]): UserProfile {
  const tasteVector: TasteVector = {};

  // Add item ratings to vector (key: item_id, value: normalized rating)
  ratings.forEach((rating) => {
    tasteVector[`item_${rating.item_id}`] = rating.rating / 5.0;
  });

  // Add tag preferences to vector
  const tagCounts = new Map<string, number>();
  const tagRatingSums = new Map<string, number>();

  ratings.forEach((rating) => {
    const tags = rating.rating_details?.tags || [];
    tags.forEach((tag) => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      tagRatingSums.set(tag, (tagRatingSums.get(tag) || 0) + rating.rating);
    });
  });

  // Normalize tag preferences
  tagCounts.forEach((count, tag) => {
    const avgRating = tagRatingSums.get(tag)! / count;
    const frequency = count / ratings.length;
    tasteVector[`tag_${tag}`] = (avgRating / 5.0) * frequency;
  });

  // Add cuisine preferences
  const cuisineCounts = new Map<string, number>();
  const cuisineRatingSums = new Map<string, number>();

  ratings.forEach((rating) => {
    const cuisine = rating.items?.attributes?.cuisine_type;
    if (cuisine) {
      cuisineCounts.set(cuisine, (cuisineCounts.get(cuisine) || 0) + 1);
      cuisineRatingSums.set(cuisine, (cuisineRatingSums.get(cuisine) || 0) + rating.rating);
    }
  });

  cuisineCounts.forEach((count, cuisine) => {
    const avgRating = cuisineRatingSums.get(cuisine)! / count;
    const frequency = count / ratings.length;
    tasteVector[`cuisine_${cuisine}`] = (avgRating / 5.0) * frequency;
  });

  // Normalize the entire vector
  const normalizedVector = normalizeVector(tasteVector);

  return {
    userId,
    ratings,
    tasteVector: normalizedVector,
  };
}

/**
 * Normalizes a vector to unit length (L2 normalization)
 */
function normalizeVector(vector: TasteVector): TasteVector {
  const magnitude = Math.sqrt(
    Object.values(vector).reduce((sum, val) => sum + val * val, 0)
  );

  if (magnitude === 0) return vector;

  const normalized: TasteVector = {};
  Object.entries(vector).forEach(([key, value]) => {
    normalized[key] = value / magnitude;
  });

  return normalized;
}

/**
 * Calculates cosine similarity between two vectors
 *
 * Returns value between -1 and 1:
 * - 1: Identical taste
 * - 0: Orthogonal (unrelated)
 * - -1: Opposite taste
 */
function calculateCosineSimilarity(vectorA: TasteVector, vectorB: TasteVector): number {
  const allKeys = new Set([...Object.keys(vectorA), ...Object.keys(vectorB)]);

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  allKeys.forEach((key) => {
    const a = vectorA[key] || 0;
    const b = vectorB[key] || 0;

    dotProduct += a * b;
    magnitudeA += a * a;
    magnitudeB += b * b;
  });

  const magnitude = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);

  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

/**
 * Creates an item vector for similarity comparison
 */
function createItemVector(item: any): TasteVector {
  const vector: TasteVector = {};

  // Add cuisine attribute
  const cuisine = item.attributes?.cuisine_type;
  if (cuisine) {
    vector[`cuisine_${cuisine}`] = 1.0;
  }

  // Add price range as a feature
  const priceRange = item.attributes?.price_range;
  if (priceRange) {
    const priceValue = priceRange.length / 4.0; // $ = 0.25, $$$$ = 1.0
    vector[`price_range`] = priceValue;
  }

  return normalizeVector(vector);
}

/**
 * Calculates recommendations using blended scoring
 *
 * Formula: final_score = (0.3 * personal_similarity) + (0.7 * weighted_friends_average)
 */
function calculateRecommendations(
  userProfile: UserProfile,
  tasteTwins: TasteTwin[],
  unratedItems: any[]
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  unratedItems.forEach((item) => {
    // Calculate personal similarity score (user's taste vector vs item attributes)
    const itemVector = createItemVector(item);
    const personalScore = calculateCosineSimilarity(userProfile.tasteVector, itemVector);

    // Calculate friends' weighted score
    let friendsScore = 0;
    let tasteTwinsCount = 0;
    let totalWeight = 0;

    tasteTwins.forEach((twin) => {
      // Check if this taste twin has rated this item
      const twinRating = twin.ratings.find((r) => r.item_id === item.id);

      if (twinRating) {
        const weight = twin.similarity; // Weight by similarity
        friendsScore += (twinRating.rating / 5.0) * weight;
        totalWeight += weight;
        tasteTwinsCount++;
      }
    });

    // Normalize friends score
    if (totalWeight > 0) {
      friendsScore = friendsScore / totalWeight;
    }

    // Calculate blended score only if at least one taste twin has rated it
    if (tasteTwinsCount > 0 || personalScore > 0) {
      const blendedScore = (PERSONAL_WEIGHT * personalScore) + (FRIENDS_WEIGHT * friendsScore);

      recommendations.push({
        item_id: item.id,
        item_name: item.name,
        category: item.category,
        score: Math.round(blendedScore * 100) / 100,
        personal_score: Math.round(personalScore * 100) / 100,
        friends_score: Math.round(friendsScore * 100) / 100,
        taste_twins_count: tasteTwinsCount,
        attributes: item.attributes,
      });
    }
  });

  // Sort by blended score
  return recommendations.sort((a, b) => b.score - a.score);
}
