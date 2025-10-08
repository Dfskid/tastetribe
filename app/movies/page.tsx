'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Film, Search, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

interface Movie {
  id: string;
  name: string;
  attributes: {
    title: string;
    genre: string;
    release_year: number;
    director: string;
    rating: string;
    runtime_minutes: number;
    imdb_rating: number;
    streaming_platforms: string[];
    description: string;
  };
}

export default function MoviesPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('');

  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('category_type', 'movie')
        .order('attributes->imdb_rating', { ascending: false });

      if (error) throw error;
      setMovies(data || []);
    } catch (error) {
      console.error('Error fetching movies:', error);
    } finally {
      setLoading(false);
    }
  };

  const genres = Array.from(
    new Set(movies.map((m) => m.attributes.genre))
  ).sort();

  const filteredMovies = movies.filter((movie) => {
    const matchesSearch = searchQuery
      ? movie.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        movie.attributes.director.toLowerCase().includes(searchQuery.toLowerCase()) ||
        movie.attributes.description.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    const matchesGenre = selectedGenre
      ? movie.attributes.genre === selectedGenre
      : true;

    return matchesSearch && matchesGenre;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Film className="h-8 w-8 text-blue-600" />
            <h1 className="text-4xl font-bold">Movies</h1>
          </div>
          <p className="text-slate-600 text-lg">
            Discover and explore great movies across different genres
          </p>
        </div>

        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search movies by title, director, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-lg"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedGenre === '' ? 'default' : 'outline'}
              onClick={() => setSelectedGenre('')}
              className="rounded-full"
            >
              All Genres
            </Button>
            {genres.map((genre) => (
              <Button
                key={genre}
                variant={selectedGenre === genre ? 'default' : 'outline'}
                onClick={() => setSelectedGenre(genre)}
                className="rounded-full"
              >
                {genre}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading movies...</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-slate-600">
                Showing {filteredMovies.length} {filteredMovies.length === 1 ? 'movie' : 'movies'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMovies.map((movie) => (
                <Card
                  key={movie.id}
                  className="hover:shadow-lg transition-shadow duration-200 border-slate-200"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-xl line-clamp-2">
                        {movie.attributes.title}
                      </CardTitle>
                      <div className="flex items-center gap-1 shrink-0 bg-amber-100 text-amber-800 px-2 py-1 rounded-md">
                        <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                        <span className="font-semibold">
                          {movie.attributes.imdb_rating}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {movie.attributes.genre}
                      </span>
                      <span>{movie.attributes.release_year}</span>
                      <span>•</span>
                      <span>{movie.attributes.rating}</span>
                      <span>•</span>
                      <span>{movie.attributes.runtime_minutes} min</span>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-1">
                        Director: {movie.attributes.director}
                      </p>
                    </div>

                    <p className="text-sm text-slate-600 line-clamp-3">
                      {movie.attributes.description}
                    </p>

                    {movie.attributes.streaming_platforms &&
                      movie.attributes.streaming_platforms.length > 0 && (
                        <div className="pt-2 border-t border-slate-200">
                          <p className="text-xs text-slate-500 mb-2">
                            Available on:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {movie.attributes.streaming_platforms.map(
                              (platform) => (
                                <span
                                  key={platform}
                                  className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded"
                                >
                                  {platform}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredMovies.length === 0 && (
              <div className="text-center py-12">
                <Film className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <p className="text-lg text-slate-600">
                  No movies found matching your criteria
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  Try adjusting your search or filters
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
