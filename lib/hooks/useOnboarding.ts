/**
 * Onboarding Hook
 *
 * Manages the complete onboarding flow including geolocation, restaurant
 * fetching, rating collection, and taste profile generation.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import {
  getLocationWithFallback,
  GeolocationCoordinates,
  GeolocationError,
} from '@/lib/services/geolocation';
import {
  getOnboardingRestaurants,
  Restaurant,
} from '@/lib/services/restaurant';

export interface OnboardingRating {
  restaurantId: string;
  rating: number;
  comment?: string;
}

export interface OnboardingState {
  step: number;
  totalSteps: number;
  location: GeolocationCoordinates | null;
  locationSource: 'geolocation' | 'ip' | 'default' | null;
  locationError: GeolocationError | null;
  restaurants: Restaurant[];
  currentRestaurantIndex: number;
  ratings: OnboardingRating[];
  isLoading: boolean;
  error: string | null;
  isComplete: boolean;
}

const TOTAL_STEPS = 3; // 1: Location, 2: Rating, 3: Complete
const TARGET_RATINGS = 12;

export function useOnboarding() {
  const { user, profile, updateProfile } = useAuth();
  const [state, setState] = useState<OnboardingState>({
    step: 1,
    totalSteps: TOTAL_STEPS,
    location: null,
    locationSource: null,
    locationError: null,
    restaurants: [],
    currentRestaurantIndex: 0,
    ratings: [],
    isLoading: false,
    error: null,
    isComplete: false,
  });

  /**
   * Step 1: Get user location
   */
  const getLocation = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await getLocationWithFallback();

      setState(prev => ({
        ...prev,
        location: result.coordinates,
        locationSource: result.source,
        locationError: result.error || null,
        isLoading: false,
      }));

      // Save location to profile
      if (user && result.coordinates) {
        await supabase
          .from('profiles')
          .update({
            location: `POINT(${result.coordinates.longitude} ${result.coordinates.latitude})`,
          } as any)
          .eq('id', user.id);
      }

      return result;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to get location. Please try again.',
      }));
      return null;
    }
  }, [user]);

  /**
   * Step 2: Fetch nearby restaurants
   */
  const fetchRestaurants = useCallback(async () => {
    if (!state.location) {
      setState(prev => ({ ...prev, error: 'Location is required' }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { restaurants, error } = await getOnboardingRestaurants(
        state.location,
        TARGET_RATINGS
      );

      if (error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error.message,
        }));
        return;
      }

      setState(prev => ({
        ...prev,
        restaurants,
        isLoading: false,
        step: 2,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load restaurants. Please try again.',
      }));
    }
  }, [state.location]);

  /**
   * Submit a rating for the current restaurant
   */
  const submitRating = useCallback(
    async (rating: number, comment?: string) => {
      if (!user) return;

      const currentRestaurant = state.restaurants[state.currentRestaurantIndex];
      if (!currentRestaurant) return;

      setState(prev => ({ ...prev, isLoading: true }));

      try {
        // Save rating to database (only if rating > 0)
        if (rating > 0) {
          const { error } = await supabase.from('user_ratings').insert({
            user_id: user.id,
            item_id: currentRestaurant.id,
            rating,
            review: comment || null,
          } as any);

          if (error) throw error;
        }

        // Update local state
        const newRating: OnboardingRating = {
          restaurantId: currentRestaurant.id,
          rating,
          comment,
        };

        setState(prev => {
          const newRatings = [...prev.ratings, newRating];
          const nextIndex = prev.currentRestaurantIndex + 1;
          const isLastRestaurant = nextIndex >= prev.restaurants.length;

          return {
            ...prev,
            ratings: newRatings,
            currentRestaurantIndex: nextIndex,
            isLoading: false,
            step: isLastRestaurant ? 3 : 2,
          };
        });

        // If this was the last restaurant, complete onboarding
        if (state.currentRestaurantIndex + 1 >= state.restaurants.length) {
          await completeOnboarding();
        }
      } catch (error) {
        console.error('Error submitting rating:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to submit rating. Please try again.',
        }));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, state.currentRestaurantIndex, state.restaurants]
  );

  /**
   * Complete onboarding process
   */
  const completeOnboarding = useCallback(async () => {
    if (!user) return;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Mark onboarding as complete
      const { error } = await updateProfile({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      } as any);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        isComplete: true,
        isLoading: false,
        step: 3,
      }));
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to complete onboarding. Please try again.',
      }));
    }
  }, [user, updateProfile]);

  /**
   * Skip current restaurant
   */
  const skipRestaurant = useCallback(async () => {
    await submitRating(0);
  }, [submitRating]);

  /**
   * Go to previous restaurant
   */
  const previousRestaurant = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentRestaurantIndex: Math.max(0, prev.currentRestaurantIndex - 1),
      ratings: prev.ratings.slice(0, -1),
    }));
  }, []);

  /**
   * Reset onboarding state
   */
  const resetOnboarding = useCallback(() => {
    setState({
      step: 1,
      totalSteps: TOTAL_STEPS,
      location: null,
      locationSource: null,
      locationError: null,
      restaurants: [],
      currentRestaurantIndex: 0,
      ratings: [],
      isLoading: false,
      error: null,
      isComplete: false,
    });
  }, []);

  /**
   * Get progress percentage
   */
  const getProgress = useCallback((): number => {
    if (state.step === 1) return 0;
    if (state.step === 3) return 100;

    const totalRestaurants = state.restaurants.length;
    if (totalRestaurants === 0) return 0;

    return Math.round(
      (state.currentRestaurantIndex / totalRestaurants) * 100
    );
  }, [state.step, state.currentRestaurantIndex, state.restaurants.length]);

  return {
    state,
    actions: {
      getLocation,
      fetchRestaurants,
      submitRating,
      skipRestaurant,
      previousRestaurant,
      completeOnboarding,
      resetOnboarding,
    },
    computed: {
      currentRestaurant: state.restaurants[state.currentRestaurantIndex] || null,
      progress: getProgress(),
      hasRatedMinimum: state.ratings.filter(r => r.rating > 0).length >= 5,
      canGoBack: state.currentRestaurantIndex > 0,
    },
  };
}
