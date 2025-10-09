import { createClient } from '@/lib/supabase/client';

export interface DetailedRestaurantRating {
  overall: number;
  ambience?: number;
  price?: number;
  foodQuality?: number;
  service?: number;
  tags?: string[];
}

export async function saveRestaurantRating(
  restaurantId: string,
  rating: DetailedRestaurantRating
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Check if rating already exists
  const { data: existingRating } = await supabase
    .from('user_ratings')
    .select('id')
    .eq('user_id', user.id)
    .eq('item_id', restaurantId)
    .single();

  if (existingRating) {
    // Update existing rating
    const { error } = await supabase
      .from('user_ratings')
      .update({
        overall_rating: rating.overall,
        ambience_rating: rating.ambience,
        price_rating: rating.price,
        food_quality_rating: rating.foodQuality,
        service_rating: rating.service,
        tags: rating.tags || []
      })
      .eq('id', existingRating.id);

    if (error) throw error;
  } else {
    // Insert new rating
    const { error } = await supabase
      .from('user_ratings')
      .insert({
        user_id: user.id,
        item_id: restaurantId,
        overall_rating: rating.overall,
        ambience_rating: rating.ambience,
        price_rating: rating.price,
        food_quality_rating: rating.foodQuality,
        service_rating: rating.service,
        tags: rating.tags || []
      });

    if (error) throw error;
  }

  return { success: true };
}

export async function getOnboardingProgress(userId: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('user_ratings')
    .select('id')
    .eq('user_id', userId);

  if (error) throw error;
  
  return {
    ratingsCount: data?.length || 0,
    isComplete: (data?.length || 0) >= 10
  };
}
