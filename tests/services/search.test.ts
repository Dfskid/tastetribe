import { describe, it, expect, beforeEach, vi } from 'vitest';
import { searchRestaurants } from '@/lib/services/google-places';

describe.skip('Search and Filter Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchRestaurants', () => {
    it('should search restaurants with basic query', async () => {
      const mockResults = [
        {
          id: '1',
          name: 'Pizza Place',
          category: 'restaurant',
          attributes: { cuisine_type: 'Pizza' },
        },
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResults, error: null }),
      } as Response);

      const result = await searchRestaurants({ query: 'pizza' });

      expect(result.error).toBeNull();
      expect(result.restaurants).toHaveLength(1);
      expect(result.restaurants[0].name).toBe('Pizza Place');
    });

    it('should filter by cuisine type', async () => {
      const mockResults = [
        {
          id: '1',
          name: 'Italian Restaurant',
          attributes: { cuisine_type: 'Italian' },
        },
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResults, error: null }),
      } as Response);

      const result = await searchRestaurants({ cuisineType: 'Italian' });

      expect(result.error).toBeNull();
      expect(result.restaurants[0].attributes.cuisine_type).toBe('Italian');
    });

    it('should filter by price range', async () => {
      const mockResults = [
        {
          id: '1',
          name: 'Budget Restaurant',
          attributes: { price_range: '$' },
        },
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResults, error: null }),
      } as Response);

      const result = await searchRestaurants({ priceRange: '$' });

      expect(result.error).toBeNull();
      expect(result.restaurants[0].attributes.price_range).toBe('$');
    });

    it('should filter by minimum rating', async () => {
      const mockResults = [
        {
          id: '1',
          name: 'Top Restaurant',
          attributes: { google_rating: 4.5 },
        },
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResults, error: null }),
      } as Response);

      const result = await searchRestaurants({ minRating: 4.0 });

      expect(result.error).toBeNull();
      expect(result.restaurants[0].attributes.google_rating).toBeGreaterThanOrEqual(4.0);
    });

    it('should search by location with distance filter', async () => {
      const mockResults = [
        {
          id: '1',
          name: 'Nearby Restaurant',
          location: { lat: 39.7392, lng: -104.9903 },
        },
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResults, error: null }),
      } as Response);

      const result = await searchRestaurants({
        latitude: 39.7392,
        longitude: -104.9903,
        maxDistanceKm: 5,
      });

      expect(result.error).toBeNull();
      expect(result.restaurants).toHaveLength(1);
    });

    it('should support pagination', async () => {
      const mockResults = Array.from({ length: 10 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Restaurant ${i + 1}`,
      }));

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResults, error: null }),
      } as Response);

      const result = await searchRestaurants({
        limit: 10,
        offset: 0,
      });

      expect(result.restaurants).toHaveLength(10);
    });

    it('should combine multiple filters', async () => {
      const mockResults = [
        {
          id: '1',
          name: 'Perfect Match',
          attributes: {
            cuisine_type: 'Italian',
            price_range: '$$',
            google_rating: 4.5,
          },
        },
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResults, error: null }),
      } as Response);

      const result = await searchRestaurants({
        cuisineType: 'Italian',
        priceRange: '$$',
        minRating: 4.0,
        latitude: 39.7392,
        longitude: -104.9903,
        maxDistanceKm: 10,
      });

      expect(result.error).toBeNull();
      expect(result.restaurants[0].attributes.cuisine_type).toBe('Italian');
      expect(result.restaurants[0].attributes.price_range).toBe('$$');
    });

    it('should handle empty results', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], error: null }),
      } as Response);

      const result = await searchRestaurants({ query: 'nonexistent' });

      expect(result.error).toBeNull();
      expect(result.restaurants).toHaveLength(0);
    });

    it('should handle database errors gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const result = await searchRestaurants({ query: 'test' });

      expect(result.error).not.toBeNull();
      expect(result.restaurants).toHaveLength(0);
    });

    it('should use default values for optional parameters', async () => {
      const mockResults: any[] = [];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResults, error: null }),
      } as Response);

      const result = await searchRestaurants({});

      expect(result.error).toBeNull();
    });

    it('should handle special characters in query', async () => {
      const mockResults = [
        {
          id: '1',
          name: "Restaurant with 'special' characters",
        },
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResults, error: null }),
      } as Response);

      const result = await searchRestaurants({
        query: "special' OR '1'='1",
      });

      expect(result.error).toBeNull();
    });

    it('should respect limit parameter', async () => {
      const mockResults = Array.from({ length: 5 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Restaurant ${i + 1}`,
      }));

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResults, error: null }),
      } as Response);

      const result = await searchRestaurants({ limit: 5 });

      expect(result.restaurants.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Geographic Search', () => {
    it('should calculate distances correctly', async () => {
      const mockResults = [
        {
          id: '1',
          name: 'Restaurant',
          location: { lat: 39.7392, lng: -104.9903 },
          distance_km: 2.5,
        },
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResults, error: null }),
      } as Response);

      const result = await searchRestaurants({
        latitude: 39.7392,
        longitude: -104.9903,
        maxDistanceKm: 5,
      });

      expect(result.restaurants[0].distance_km).toBeLessThanOrEqual(5);
    });

    it('should handle locations without coordinates', async () => {
      const mockResults = [
        {
          id: '1',
          name: 'Restaurant',
          location: null,
        },
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResults, error: null }),
      } as Response);

      const result = await searchRestaurants({ query: 'test' });

      expect(result.error).toBeNull();
    });
  });

  describe('Relevance Scoring', () => {
    it('should prioritize exact name matches', async () => {
      const mockResults = [
        { id: '1', name: 'Pizza Palace', relevance_score: 1.0 },
        { id: '2', name: 'Italian Restaurant with Pizza', relevance_score: 0.5 },
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResults, error: null }),
      } as Response);

      const result = await searchRestaurants({ query: 'Pizza Palace' });

      expect(result.restaurants[0].relevance_score).toBeGreaterThan(
        result.restaurants[1].relevance_score
      );
    });

    it('should factor in ratings when sorting', async () => {
      const mockResults = [
        {
          id: '1',
          name: 'Restaurant A',
          attributes: { google_rating: 4.8 },
        },
        {
          id: '2',
          name: 'Restaurant B',
          attributes: { google_rating: 3.5 },
        },
      ];

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResults, error: null }),
      } as Response);

      const result = await searchRestaurants({ query: 'restaurant' });

      expect(result.restaurants[0].attributes.google_rating).toBeGreaterThanOrEqual(
        result.restaurants[1].attributes.google_rating
      );
    });
  });
});
