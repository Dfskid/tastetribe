'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, MapPin, DollarSign, Utensils, Loader2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  fetchOnboardingRestaurants,
  saveRestaurantRating,
  completeOnboarding,
  type Restaurant,
} from '@/lib/services/onboarding';
import { getLocationWithFallback } from '@/lib/services/geolocation';
import TouchStarRating from '@/components/onboarding/TouchStarRating';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';

const MINIMUM_RATINGS = 10;

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();

  const [userId, setUserId] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentRating, setCurrentRating] = useState(0);
  const [ratedRestaurants, setRatedRestaurants] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

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
      const fetchedRestaurants = await fetchOnboardingRestaurants(location.coordinates);

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

  const handleRate = async () => {
    if (!userId || currentRating === 0) return;

    setIsSubmitting(true);

    try {
      const currentRestaurant = restaurants[currentIndex];
      const result = await saveRestaurantRating(userId, currentRestaurant.id, currentRating);

      if (!result.success) {
        toast({
          title: 'Error',
          description: 'Failed to save rating. Please try again.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      const newRated = new Set(ratedRestaurants);
      newRated.add(currentRestaurant.id);
      setRatedRestaurants(newRated);

      if (newRated.size >= MINIMUM_RATINGS) {
        await handleComplete();
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

  const handleSkip = () => {
    if (isSubmitting) return;
    moveToNext();
  };

  const moveToNext = () => {
    setDirection('forward');
    setCurrentRating(0);

    if (currentIndex < restaurants.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handleComplete = async () => {
    if (!userId) return;

    try {
      const result = await completeOnboarding(userId);

      if (!result.success) {
        toast({
          title: 'Error',
          description: result.error || 'Failed to complete onboarding',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Welcome to TasteTribe!',
        description: 'Your taste profile has been created.',
      });

      router.push('/social');
    } catch (err) {
      console.error('Error completing onboarding:', err);
      toast({
        title: 'Error',
        description: 'Failed to complete onboarding. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 font-medium">Loading restaurants...</p>
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
  const progress = (ratedRestaurants.size / MINIMUM_RATINGS) * 100;
  const remainingRatings = Math.max(0, MINIMUM_RATINGS - ratedRestaurants.size);

  return (
    <div className="min-h-screen bg-gradient-warm flex flex-col">
      <div className="w-full max-w-2xl mx-auto px-4 py-6 flex-1 flex flex-col">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-bold text-gray-800">
              Build Your Taste Profile
            </h1>
            <span className="text-sm font-medium text-gray-600 bg-white px-3 py-1 rounded-full shadow-sm">
              {ratedRestaurants.size} / {MINIMUM_RATINGS}
            </span>
          </div>

          <div className="h-2 bg-white/50 rounded-full overflow-hidden shadow-inner">
            <motion.div
              className="h-full bg-gradient-to-r from-tomato-400 to-tomato-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>

          {remainingRatings > 0 && (
            <p className="text-sm text-gray-600 mt-2 text-center">
              Rate {remainingRatings} more {remainingRatings === 1 ? 'restaurant' : 'restaurants'} to continue
            </p>
          )}
        </div>

        <div className="flex-1 flex items-center justify-center pb-6">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentRestaurant.id}
              custom={direction}
              initial={{ opacity: 0, x: direction === 'forward' ? 100 : -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction === 'forward' ? -100 : 100 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                {currentRestaurant.image_url && (
                  <div className="h-64 bg-gray-200 relative overflow-hidden">
                    <img
                      src={currentRestaurant.image_url}
                      alt={currentRestaurant.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  </div>
                )}

                <div className="p-8">
                  <h2 className="text-3xl font-bold text-gray-800 mb-4 text-center">
                    {currentRestaurant.name}
                  </h2>

                  <div className="space-y-3 mb-8">
                    {currentRestaurant.cuisine_type && (
                      <div className="flex items-center justify-center gap-2 text-gray-600">
                        <Utensils className="w-5 h-5" />
                        <span className="font-medium">{currentRestaurant.cuisine_type}</span>
                      </div>
                    )}

                    {currentRestaurant.price_range && (
                      <div className="flex items-center justify-center gap-2 text-gray-600">
                        <DollarSign className="w-5 h-5" />
                        <span className="font-medium">{currentRestaurant.price_range}</span>
                      </div>
                    )}

                    {currentRestaurant.address && (
                      <div className="flex items-center justify-center gap-2 text-gray-600 text-sm">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span>{currentRestaurant.address}</span>
                      </div>
                    )}
                  </div>

                  <div className="mb-8">
                    <p className="text-center text-gray-700 font-medium mb-4 text-lg">
                      How would you rate this restaurant?
                    </p>
                    <TouchStarRating
                      value={currentRating}
                      onChange={setCurrentRating}
                      size="lg"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="flex gap-4">
                    <motion.button
                      onClick={handleSkip}
                      disabled={isSubmitting}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 px-6 py-4 bg-gray-100 text-gray-700 rounded-2xl font-semibold text-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Skip
                    </motion.button>

                    <motion.button
                      onClick={handleRate}
                      disabled={currentRating === 0 || isSubmitting}
                      whileHover={currentRating > 0 && !isSubmitting ? { scale: 1.02 } : {}}
                      whileTap={currentRating > 0 && !isSubmitting ? { scale: 0.98 } : {}}
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
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
