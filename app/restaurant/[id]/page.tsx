'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { invalidateRecommendationCache, trackRecommendationRating } from '@/lib/services/recommendations';
import { analytics } from '@/lib/services/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Star, MapPin, DollarSign, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface Restaurant {
  id: string;
  name: string;
  category: string;
  attributes: {
    cuisine_type?: string;
    price_range?: string;
    address?: string;
    phone?: string;
  };
}

export default function RestaurantPage({ params }: { params: { id: string } }) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session');

  useEffect(() => {
    loadRestaurant();
    loadUserRating();
  }, [params.id]);

  const loadRestaurant = async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('id', params.id)
      .eq('category', 'restaurant')
      .maybeSingle();

    if (error || !data) {
      toast({
        title: 'Error',
        description: 'Restaurant not found',
        variant: 'destructive',
      });
      router.push('/discover');
    } else {
      setRestaurant(data);
    }
    setLoading(false);
  };

  const loadUserRating = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_ratings')
      .select('rating')
      .eq('item_id', params.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setUserRating(data.rating);
      setRating(data.rating);
    }
  };

  const handleSubmitRating = async () => {
    if (rating === 0) {
      toast({
        title: 'Please select a rating',
        description: 'Tap on the stars to rate this restaurant',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to rate restaurants',
        variant: 'destructive',
      });
      setSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from('user_ratings')
      .upsert({
        user_id: user.id,
        item_id: params.id,
        rating,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit rating',
        variant: 'destructive',
      });
    } else {
      // Track analytics
      analytics.trackRating(params.id, rating, 'restaurant');

      if (sessionId) {
        await trackRecommendationRating(params.id, rating, sessionId);
      }

      // Invalidate cache since taste profile has changed
      await invalidateRecommendationCache();

      toast({
        title: 'Rating submitted',
        description: 'Your rating has been saved',
      });
      setUserRating(rating);
      setTimeout(() => {
        router.push('/discover');
      }, 1500);
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!restaurant) {
    return null;
  }

  const displayRating = hoveredRating || rating;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          href="/discover"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Discover
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl mb-4">{restaurant.name}</CardTitle>
            <div className="flex flex-wrap gap-3 text-sm text-slate-600">
              {restaurant.attributes.cuisine_type && (
                <span>{restaurant.attributes.cuisine_type}</span>
              )}
              {restaurant.attributes.price_range && (
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {restaurant.attributes.price_range}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {restaurant.attributes.address && (
              <div className="flex items-start gap-2 text-sm text-slate-600">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{restaurant.attributes.address}</span>
              </div>
            )}

            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4 text-center">
                {userRating ? 'Update Your Rating' : 'Rate This Restaurant'}
              </h3>
              <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-10 w-10 ${
                        star <= displayRating
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>

              {rating > 0 && (
                <p className="text-center text-slate-600 mb-6">
                  {rating === 1 && 'Not great'}
                  {rating === 2 && 'Could be better'}
                  {rating === 3 && "It's okay"}
                  {rating === 4 && 'Good'}
                  {rating === 5 && 'Amazing!'}
                </p>
              )}

              <Button
                onClick={handleSubmitRating}
                disabled={submitting || rating === 0}
                className="w-full"
                size="lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Star className="h-4 w-4 mr-2" />
                    {userRating ? 'Update Rating' : 'Submit Rating'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
