'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertCircle, ChevronRight, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getLocationWithFallback } from '@/lib/services/geolocation';
import RestaurantCard from '@/components/onboarding/RestaurantCard';
import EnhancedStarRating from '@/components/onboarding/EnhancedStarRating';
import ContextualTags from '@/components/onboarding/ContextualTags';
import ProgressTracker from '@/components/onboarding/ProgressTracker';
import CompletionCelebration from '@/components/onboarding/CompletionCelebration';
import { useToast } from '@/hooks/use-toast';

const MINIMUM_RATINGS = 10;
const RESTAURANTS_TO_FETCH = 20;

interface Restaurant {
  id: string;
  name: string;
  attributes: {
    cuisine_type?: string;
    price_range?: string;
    address?: string;
    image_url?: string;
    photo_url?: string;
    latitude?: number;
    longitude?: number;
  };
  distance?: number;
}

interface RatingData {
  rating: number;
  tags: string[];
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  const [userId, setUserId] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ratedCount, setRatedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const [currentRating, setCurrentRating] = useState<RatingData>({
    rating: 0,
    tags: [],
  });

  useEffect(() => {
    initializeOnboarding();
  }, []);

  const initializeOnboarding = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      setUserId(user.id);

      const location = await getLocationWithFallback();

      let fetchedRestaurants: Restaurant[] = [];

      try {
        const { data, error: rpcError } = await supabase.rpc('get_nearby_restaurants', {
          user_lat: location.coordinates.latitude,
          user_lng: location.coordinates.longitude,
          max_distance: 50000,
          limit_count: RESTAURANTS_TO_FETCH,
        });

        if (!rpcError && data && data.length > 0) {
          fetchedRestaurants = data.map((item: any) => ({
            ...item,
            distance: item.distance,
          }));
        }
      } catch (err) {
        console.warn('Location-based fetch failed, using simple query');
      }

      if (fetchedRestaurants.length === 0) {
        const { data, error: queryError } = await supabase
          .from('items')
          .select('*')
          .eq('category', 'restaurant')
          .limit(RESTAURANTS_TO_FETCH);

        if (queryError) throw queryError;
        fetchedRestaurants = data || [];
      }

      if (fetchedRestaurants.length === 0) {
        setError('No restaurants found. Please try again later.');
        return;
      }

      setRestaurants(fetchedRestaurants);
    } catch (err) {
      console.error('Error initializing onboarding:', err);
      setError('Failed to load restaurants. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTagToggle = (tag: string) => {
    setCurrentRating((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const saveRating = async () => {
    if (!userId || currentRating.rating === 0) return;

    setIsSubmitting(true);

    try {
      const restaurant = restaurants[currentIndex];

      const { error } = await supabase.from('user_ratings').insert({
        user_id: userId,
        item_id: restaurant.id,
        rating: currentRating.rating,
        rating_details: {
          tags: currentRating.tags,
          timestamp: new Date().toISOString(),
          restaurant_name: restaurant.name,
          cuisine_type: restaurant.attributes.cuisine_type,
        },
      });

      if (error) throw error;

      const newRatedCount = ratedCount + 1;
      setRatedCount(newRatedCount);

      if (newRatedCount >= MINIMUM_RATINGS) {
        await completeOnboarding();
      } else {
        moveToNext();
      }
    } catch (err) {
      console.error('Error saving rating:', err);
      toast({
        title: 'Error',
        description: 'Failed to save rating. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const skipRestaurant = () => {
    if (isSubmitting) return;
    moveToNext();
  };

  const moveToNext = () => {
    setCurrentRating({ rating: 0, tags: [] });

    if (currentIndex < restaurants.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const completeOnboarding = async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      setShowCelebration(true);
    } catch (err) {
      console.error('Error completing onboarding:', err);
      toast({
        title: 'Error',
        description: 'Failed to complete onboarding. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleCelebrationContinue = () => {
    router.push('/social');
  };

  if (showCelebration) {
    return (
      <CompletionCelebration
        onContinue={handleCelebrationContinue}
        ratingsCount={ratedCount}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-tomato-500 animate-spin mx-auto" />
          <p className="text-gray-600 font-medium">Finding amazing restaurants near you...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-tomato-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Oops!</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={initializeOnboarding}
            className="px-6 py-3 bg-tomato-500 text-white rounded-full font-semibold hover:bg-tomato-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (restaurants.length === 0) {
    return null;
  }

  const currentRestaurant = restaurants[currentIndex];
  const canSubmit = currentRating.rating > 0 && !isSubmitting;

  return (
    <div className="min-h-screen bg-gradient-warm flex flex-col">
      <ProgressTracker current={ratedCount} total={MINIMUM_RATINGS} />

      <div className="flex-1 flex flex-col p-4 pb-6 max-w-2xl mx-auto w-full">
        <div className="relative flex-1 min-h-[500px] md:min-h-[600px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentRestaurant.id}
              initial={{ scale: 0.9, opacity: 0, x: 100 }}
              animate={{ scale: 1, opacity: 1, x: 0 }}
              exit={{ scale: 0.9, opacity: 0, x: -100 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0"
            >
              <RestaurantCard
                name={currentRestaurant.name}
                cuisine={currentRestaurant.attributes.cuisine_type}
                priceRange={currentRestaurant.attributes.price_range}
                address={currentRestaurant.attributes.address}
                imageUrl={
                  currentRestaurant.attributes.image_url ||
                  currentRestaurant.attributes.photo_url
                }
                distance={currentRestaurant.distance}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 space-y-6 bg-white rounded-3xl p-6 md:p-8 shadow-xl"
        >
          <div>
            <p className="text-center text-gray-700 font-medium mb-4 text-lg">
              How would you rate this place?
            </p>
            <EnhancedStarRating
              value={currentRating.rating}
              onChange={(rating) =>
                setCurrentRating((prev) => ({ ...prev, rating }))
              }
              disabled={isSubmitting}
            />
          </div>

          <AnimatePresence>
            {currentRating.rating > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <ContextualTags
                  selectedTags={currentRating.tags}
                  onTagToggle={handleTagToggle}
                  disabled={isSubmitting}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-3">
            <motion.button
              onClick={skipRestaurant}
              disabled={isSubmitting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 px-6 py-4 bg-gray-100 text-gray-700 rounded-2xl font-semibold text-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <X className="w-5 h-5" />
              Skip
            </motion.button>

            <motion.button
              onClick={saveRating}
              disabled={!canSubmit}
              whileHover={canSubmit ? { scale: 1.02 } : {}}
              whileTap={canSubmit ? { scale: 0.98 } : {}}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-tomato-500 to-tomato-600 text-white rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Rate
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
