'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getPersonalizedRecommendations,
  getTrendingItems,
  generateSessionId,
  trackRecommendationView,
  type Recommendation,
  type TrendingItem,
} from '@/lib/services/recommendations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, MapPin, Star, DollarSign, TrendingUp, Users, Sparkles, RefreshCw, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { analytics } from '@/lib/services/analytics';
import Link from 'next/link';

interface RestaurantAttrs {
  cuisine_type?: string;
  price_range?: string;
  address?: string;
}

export default function DiscoverPage() {
  const [personalizedRecs, setPersonalizedRecs] = useState<Recommendation[]>([]);
  const [filteredRecs, setFilteredRecs] = useState<Recommendation[]>([]);
  const [trendingItems, setTrendingItems] = useState<TrendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [sessionId] = useState(generateSessionId());
  const [metadata, setMetadata] = useState<any>(null);
  const [selectedCuisine, setSelectedCuisine] = useState<string>('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('all');
  const [availableCuisines, setAvailableCuisines] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadAllRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personalizedRecs, selectedCuisine, selectedPriceRange]);

  const applyFilters = () => {
    let filtered = [...personalizedRecs];

    if (selectedCuisine !== 'all') {
      filtered = filtered.filter((rec) => {
        const attrs = rec.attributes as RestaurantAttrs;
        return attrs.cuisine_type?.toLowerCase() === selectedCuisine.toLowerCase();
      });
    }

    if (selectedPriceRange !== 'all') {
      filtered = filtered.filter((rec) => {
        const attrs = rec.attributes as RestaurantAttrs;
        return attrs.price_range === selectedPriceRange;
      });
    }

    setFilteredRecs(filtered);
  };

  const extractCuisines = (recommendations: Recommendation[]) => {
    const cuisines = new Set<string>();
    recommendations.forEach((rec) => {
      const attrs = rec.attributes as RestaurantAttrs;
      if (attrs.cuisine_type) {
        cuisines.add(attrs.cuisine_type);
      }
    });
    return Array.from(cuisines).sort();
  };

  const loadAllRecommendations = async (forceRefresh: boolean = false) => {
    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const loc = {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          };
          setLocation(loc);

          // Load personalized recommendations
          const { recommendations, metadata: meta, error } = await getPersonalizedRecommendations({
            latitude: loc.lat,
            longitude: loc.lon,
            limit: 20,
            forceRefresh,
          });

          if (error) {
            toast({
              title: 'Error',
              description: 'Failed to load recommendations',
              variant: 'destructive',
            });
          } else {
            setPersonalizedRecs(recommendations);
            setFilteredRecs(recommendations);
            setAvailableCuisines(extractCuisines(recommendations));
            setMetadata(meta);
          }

          // Load trending items
          const { trending, error: trendingError } = await getTrendingItems('restaurant', 20);
          if (!trendingError) {
            setTrendingItems(trending);
          }

          setLoading(false);
          setRefreshing(false);
        },
        () => {
          // Fallback to Denver, CO
          loadWithDefaultLocation(forceRefresh);
        }
      );
    } else {
      loadWithDefaultLocation(forceRefresh);
    }
  };

  const loadWithDefaultLocation = async (forceRefresh: boolean = false) => {
    const defaultLoc = { lat: 39.7392, lon: -104.9903 };
    setLocation(defaultLoc);

    const { recommendations, metadata: meta, error } = await getPersonalizedRecommendations({
      latitude: defaultLoc.lat,
      longitude: defaultLoc.lon,
      limit: 20,
      forceRefresh,
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load recommendations',
        variant: 'destructive',
      });
    } else {
      setPersonalizedRecs(recommendations);
      setFilteredRecs(recommendations);
      setAvailableCuisines(extractCuisines(recommendations));
      setMetadata(meta);
    }

    const { trending, error: trendingError } = await getTrendingItems('restaurant', 20);
    if (!trendingError) {
      setTrendingItems(trending);
    }

    setLoading(false);
    setRefreshing(false);
  };

  const handleRestaurantClick = async (restaurant: Recommendation, position: number) => {
    await trackRecommendationView(
      restaurant.id,
      restaurant.recommendation_score,
      position,
      sessionId
    );
  };

  const getPriceDisplay = (priceRange?: string) => {
    if (!priceRange) return null;
    return priceRange;
  };

  const renderRestaurantCard = (restaurant: Recommendation, index: number, showScore: boolean = false) => {
    const attrs = restaurant.attributes as RestaurantAttrs;

    return (
      <Card
        key={restaurant.id}
        className="hover-lift animate-fade-in"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-xl">{restaurant.name}</CardTitle>
                {restaurant.score_breakdown?.has_friend_match && (
                  <span title="Friends love this!">
                    <Users className="h-4 w-4 text-blue-500" />
                  </span>
                )}
                {restaurant.is_fallback && (
                  <span title="Trending">
                    <TrendingUp className="h-4 w-4 text-orange-500" />
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                {attrs.cuisine_type && (
                  <span className="flex items-center gap-1">
                    {attrs.cuisine_type}
                  </span>
                )}
                {attrs.price_range && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {getPriceDisplay(attrs.price_range)}
                  </span>
                )}
                {restaurant.score_breakdown?.distance_km && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {restaurant.score_breakdown.distance_km} km
                  </span>
                )}
              </div>
              {showScore && restaurant.score_breakdown && (
                <div className="mt-2 text-xs text-slate-500">
                  Match Score: {(restaurant.recommendation_score * 100).toFixed(0)}%
                  {restaurant.score_breakdown.has_friend_match && ' • Friends match'}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {attrs.address && (
            <p className="text-sm text-slate-600 mb-4">{attrs.address}</p>
          )}
          <Link href={`/restaurant/${restaurant.id}?session=${sessionId}`}>
            <Button
              className="w-full hover-scale smooth-transition"
              onClick={() => handleRestaurantClick(restaurant, index)}
            >
              <Star className="h-4 w-4 mr-2" />
              Rate This Restaurant
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-warm dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin-plate mb-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-tomato-400 to-tomato-600 flex items-center justify-center shadow-2xl">
              <span className="text-4xl">🍽️</span>
            </div>
          </div>
          <p className="text-gray-700 dark:text-slate-400 text-lg font-medium animate-pulse">
            Discovering delicious restaurants for you...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-peach-50 to-peach-100 dark:bg-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="animate-fade-in">
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-tomato-600 to-orange-500 bg-clip-text text-transparent flex items-center gap-2">
                <span className="text-3xl">🔍</span> Discover
              </h1>
              {location && (
                <p className="text-gray-700 dark:text-slate-400 flex items-center gap-2 font-medium">
                  <MapPin className="h-4 w-4 text-lime-600" />
                  Restaurants near you
                </p>
              )}
            </div>
            <button
              onClick={() => loadAllRecommendations(true)}
              disabled={refreshing}
              className="px-4 py-2 bg-gradient-to-r from-lime-500 to-lime-600 text-white rounded-full font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </span>
              )}
            </button>
          </div>

          {metadata && (
            <div className="flex flex-wrap gap-4 text-sm text-slate-600 bg-white p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span>
                  {metadata.has_taste_profile
                    ? 'Personalized for you'
                    : 'Build your taste profile by rating restaurants'}
                </span>
              </div>
              {metadata.friend_count > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{metadata.friend_count} friends helping recommendations</span>
                </div>
              )}
              {metadata.from_cache && (
                <div className="flex items-center gap-2 text-green-600">
                  <span>⚡ Cached results</span>
                </div>
              )}
            </div>
          )}
        </div>

        <Tabs defaultValue="personalized" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="personalized" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              For You
            </TabsTrigger>
            <TabsTrigger value="trending" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Trending
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personalized" className="space-y-4">
            {availableCuisines.length > 0 && (
              <div className="flex flex-wrap gap-2 p-4 bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 animate-slide-up">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <Filter className="h-4 w-4" />
                  Cuisine:
                </div>
                <Button
                  variant={selectedCuisine === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCuisine('all')}
                  className="h-8"
                >
                  All
                </Button>
                {availableCuisines.map((cuisine) => (
                  <Button
                    key={cuisine}
                    variant={selectedCuisine === cuisine ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCuisine(cuisine)}
                    className="h-8"
                  >
                    {cuisine}
                  </Button>
                ))}
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 ml-4">
                  Price:
                </div>
                <Button
                  variant={selectedPriceRange === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedPriceRange('all')}
                  className="h-8"
                >
                  All
                </Button>
                {['$', '$$', '$$$', '$$$$'].map((price) => (
                  <Button
                    key={price}
                    variant={selectedPriceRange === price ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPriceRange(price)}
                    className="h-8"
                  >
                    {price}
                  </Button>
                ))}
              </div>
            )}
            {filteredRecs.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-slate-100">
                  {personalizedRecs.length === 0 ? 'No restaurants found' : 'No matching restaurants'}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  {personalizedRecs.length === 0
                    ? "We couldn't find any restaurants near your location"
                    : 'Try adjusting your filters'}
                </p>
                {personalizedRecs.length === 0 ? (
                  <Button onClick={() => loadAllRecommendations(true)}>
                    Try Again
                  </Button>
                ) : (
                  <Button onClick={() => {
                    setSelectedCuisine('all');
                    setSelectedPriceRange('all');
                  }}>
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredRecs.map((restaurant, index) =>
                  renderRestaurantCard(restaurant, index, true)
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="trending" className="space-y-4">
            {trendingItems.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No trending items yet</h3>
                <p className="text-slate-600">
                  Start rating restaurants to see what&apos;s trending
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {trendingItems.map((trending, index) => (
                  <Card key={trending.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl font-bold text-slate-400">
                              #{trending.rank}
                            </span>
                            <CardTitle className="text-xl">{trending.item?.name}</CardTitle>
                          </div>
                          <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              {trending.avg_rating?.toFixed(1)} ({trending.rating_count} ratings)
                            </span>
                            {trending.recent_activity_count > 0 && (
                              <span className="text-orange-600">
                                {trending.recent_activity_count} recent ratings
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Link href={`/restaurant/${trending.item_id}?session=${sessionId}`}>
                        <Button
                          className="w-full"
                          onClick={() =>
                            trending.item &&
                            handleRestaurantClick(trending.item, index)
                          }
                        >
                          <Star className="h-4 w-4 mr-2" />
                          Rate This Restaurant
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
