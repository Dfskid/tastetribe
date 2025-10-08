import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TMDBService } from '@/lib/services/tmdb';

global.fetch = vi.fn();

describe('TMDBService', () => {
  let tmdbService: TMDBService;

  beforeEach(() => {
    tmdbService = new TMDBService('test-api-key');
    vi.clearAllMocks();
  });

  describe('getPopularMovies', () => {
    it('should fetch popular movies', async () => {
      const mockResponse = {
        results: [
          {
            id: 1,
            title: 'Test Movie',
            overview: 'Test overview',
            release_date: '2025-01-01',
            poster_path: '/poster.jpg',
            backdrop_path: '/backdrop.jpg',
            genre_ids: [28, 12],
            vote_average: 8.5,
            vote_count: 1000,
            popularity: 100,
            original_language: 'en',
            adult: false
          }
        ],
        total_pages: 10
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await tmdbService.getPopularMovies(1);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/movie/popular')
      );
    });

    it('should throw error on API failure', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        statusText: 'Unauthorized'
      });

      await expect(tmdbService.getPopularMovies()).rejects.toThrow(
        'TMDB API error: Unauthorized'
      );
    });
  });

  describe('transformMovieToItem', () => {
    it('should transform TMDB movie to item format', () => {
      const movie = {
        id: 123,
        title: 'Test Movie',
        overview: 'Great movie',
        release_date: '2025-01-01',
        poster_path: '/poster.jpg',
        backdrop_path: '/backdrop.jpg',
        genre_ids: [28, 12],
        vote_average: 8.5,
        vote_count: 1000,
        popularity: 95.5,
        original_language: 'en',
        adult: false
      };

      const result = tmdbService.transformMovieToItem(movie);

      expect(result).toEqual({
        category: 'movies',
        name: 'Test Movie',
        attributes: {
          tmdb_id: 123,
          overview: 'Great movie',
          release_date: '2025-01-01',
          poster_url: 'https://image.tmdb.org/t/p/w500/poster.jpg',
          backdrop_url: 'https://image.tmdb.org/t/p/w780/backdrop.jpg',
          genre_ids: [28, 12],
          rating: 8.5,
          vote_count: 1000,
          popularity: 95.5,
          language: 'en',
          adult: false
        }
      });
    });

    it('should handle null image paths', () => {
      const movie = {
        id: 123,
        title: 'Test Movie',
        overview: 'Great movie',
        release_date: '2025-01-01',
        poster_path: null,
        backdrop_path: null,
        genre_ids: [28],
        vote_average: 7.0,
        vote_count: 500,
        popularity: 50,
        original_language: 'en',
        adult: false
      };

      const result = tmdbService.transformMovieToItem(movie);

      expect(result.attributes.poster_url).toBeNull();
      expect(result.attributes.backdrop_url).toBeNull();
    });
  });

  describe('seedMovies', () => {
    it('should seed movies from multiple pages', async () => {
      const mockPage = {
        results: [
          {
            id: 1,
            title: 'Movie 1',
            overview: 'Overview 1',
            release_date: '2025-01-01',
            poster_path: '/poster1.jpg',
            backdrop_path: '/backdrop1.jpg',
            genre_ids: [28],
            vote_average: 8.0,
            vote_count: 1000,
            popularity: 100,
            original_language: 'en',
            adult: false
          }
        ],
        total_pages: 2
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockPage
      });

      const progressCallback = vi.fn();
      const result = await tmdbService.seedMovies(2, progressCallback);

      expect(result.totalFetched).toBeGreaterThan(0);
      expect(result.movies).toBeInstanceOf(Array);
      expect(progressCallback).toHaveBeenCalledTimes(2);
    });

    it('should deduplicate movies', async () => {
      const mockMovie = {
        id: 1,
        title: 'Duplicate Movie',
        overview: 'Overview',
        release_date: '2025-01-01',
        poster_path: '/poster.jpg',
        backdrop_path: '/backdrop.jpg',
        genre_ids: [28],
        vote_average: 8.0,
        vote_count: 1000,
        popularity: 100,
        original_language: 'en',
        adult: false
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          results: [mockMovie],
          total_pages: 1
        })
      });

      const result = await tmdbService.seedMovies(1);

      const movieIds = result.movies.map(m => m.attributes.tmdb_id);
      const uniqueIds = new Set(movieIds);
      expect(movieIds.length).toBe(uniqueIds.size);
    });
  });

  describe('getImageUrl', () => {
    it('should generate correct image URL', () => {
      const url = tmdbService.getImageUrl('/poster.jpg', 'w500');
      expect(url).toBe('https://image.tmdb.org/t/p/w500/poster.jpg');
    });

    it('should return null for null path', () => {
      const url = tmdbService.getImageUrl(null);
      expect(url).toBeNull();
    });

    it('should support different sizes', () => {
      const url780 = tmdbService.getImageUrl('/image.jpg', 'w780');
      const urlOriginal = tmdbService.getImageUrl('/image.jpg', 'original');

      expect(url780).toContain('/w780/');
      expect(urlOriginal).toContain('/original/');
    });
  });
});
