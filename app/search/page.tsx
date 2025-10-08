'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { searchRestaurants } from '@/lib/services/google-places';
import { Search, MapPin, Star, DollarSign, Loader2, SlidersHorizontal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { analytics } from '@/lib/services/analytics';
import Link from 'next/link';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    cuisineType: '',
    priceRange: '',
    minRating: '',
    maxDistance: '10',
  });
  const { toast } = useToast();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        () => {
          setLocation({ lat: 39.7392, lon: -104.9903 });
        }
      );
    } else {
      setLocation({ lat: 39.7392, lon: -104.9903 });
    }
  }, []);

  const handleSearch = async () => {
    if (!query.trim() && !filters.cuisineType && !filters.priceRange) {
      toast({
        title: 'Search query required',
        description: 'Please enter a search term or select filters',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    const { restaurants, error } = await searchRestaurants({
      query: query.trim() || undefined,
      latitude: location?.lat,
      longitude: location?.lon,
      maxDistanceKm: parseInt(filters.maxDistance) || 10,
      cuisineType: filters.cuisineType || undefined,
      priceRange: filters.priceRange || undefined,
      minRating: filters.minRating ? parseFloat(filters.minRating) : undefined,
      limit: 50,
    });

    setLoading(false);

    if (error) {
      toast({
        title: 'Search failed',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setResults(restaurants);
    analytics.trackSearch(query, restaurants.length);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearFilters = () => {
    setFilters({
      cuisineType: '',
      priceRange: '',
      minRating: '',
      maxDistance: '10',
    });
  };

  const cuisineTypes = [
    'Italian', 'Chinese', 'Japanese', 'Mexican', 'Indian',
    'Thai', 'American', 'French', 'Mediterranean', 'Steakhouse'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-peach-50 to-peach-100 dark:bg-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-tomato-600 to-orange-500 bg-clip-text text-transparent flex items-center gap-2">
            <span className="text-3xl">🔎</span> Search
          </h1>
          <p className="text-gray-700 dark:text-slate-400 font-medium">
            Find the perfect place to eat in Denver
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search restaurants..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={loading}
              className="gap-2 bg-gradient-to-r from-tomato-500 to-tomato-600 hover:shadow-xl hover:scale-105 transition-all rounded-full px-6 font-semibold shadow-lg"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </Button>
          </div>

          {showFilters && (
            <Card className="animate-slide-up">
              <CardHeader>
                <CardTitle className="text-lg">Search Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Cuisine Type</label>
                    <select
                      value={filters.cuisineType}
                      onChange={(e) =>
                        setFilters({ ...filters, cuisineType: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                    >
                      <option value="">All Cuisines</option>
                      {cuisineTypes.map((cuisine) => (
                        <option key={cuisine} value={cuisine}>
                          {cuisine}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Price Range</label>
                    <select
                      value={filters.priceRange}
                      onChange={(e) =>
                        setFilters({ ...filters, priceRange: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                    >
                      <option value="">Any Price</option>
                      <option value="$">$ - Budget</option>
                      <option value="$$">$$ - Moderate</option>
                      <option value="$$$">$$$ - Upscale</option>
                      <option value="$$$$">$$$$ - Fine Dining</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Min Rating</label>
                    <select
                      value={filters.minRating}
                      onChange={(e) =>
                        setFilters({ ...filters, minRating: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md dark:bg-slate-800 dark:border-slate-700"
                    >
                      <option value="">Any Rating</option>
                      <option value="3">3+ Stars</option>
                      <option value="3.5">3.5+ Stars</option>
                      <option value="4">4+ Stars</option>
                      <option value="4.5">4.5+ Stars</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Max Distance (km)</label>
                    <Input
                      type="number"
                      value={filters.maxDistance}
                      onChange={(e) =>
                        setFilters({ ...filters, maxDistance: e.target.value })
                      }
                      min="1"
                      max="50"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSearch} disabled={loading}>
                    Apply Filters
                  </Button>
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {results.length > 0 && (
          <div className="mb-4">
            <p className="text-slate-600 dark:text-slate-400">
              Found {results.length} restaurant{results.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {results.map((restaurant, index) => (
            <Card
              key={restaurant.id}
              className="hover-lift animate-fade-in card-vibrant"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <CardHeader>
                <CardTitle className="text-lg">{restaurant.name}</CardTitle>
                {restaurant.attributes?.cuisine_type && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {restaurant.attributes.cuisine_type}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {restaurant.attributes?.address && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-slate-500" />
                    <span className="text-slate-600 dark:text-slate-400">
                      {restaurant.attributes.address}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm">
                  {restaurant.avg_rating > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{restaurant.avg_rating.toFixed(1)}</span>
                      <span className="text-slate-500">
                        ({restaurant.rating_count})
                      </span>
                    </div>
                  )}

                  {restaurant.attributes?.price_range && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="font-medium">{restaurant.attributes.price_range}</span>
                    </div>
                  )}

                  {restaurant.distance_km && (
                    <span className="text-slate-500">
                      {restaurant.distance_km.toFixed(1)} km
                    </span>
                  )}
                </div>

                <Link href={`/restaurant/${restaurant.id}`}>
                  <Button className="w-full mt-2">View Details</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {!loading && results.length === 0 && query && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-slate-900 dark:text-slate-100">
              No results found
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Try adjusting your search criteria or filters
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
