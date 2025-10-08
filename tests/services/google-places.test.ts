import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  searchNearbyPlaces,
  getPlaceDetails,
  populateRestaurants,
} from '@/lib/services/google-places';

describe('Google Places Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchNearbyPlaces', () => {
    it('should successfully search for nearby places', async () => {
      const mockResponse = {
        status: 'OK',
        results: [
          {
            place_id: 'test-place-1',
            name: 'Test Restaurant',
            vicinity: '123 Test St',
            geometry: { location: { lat: 39.7392, lng: -104.9903 } },
            rating: 4.5,
            user_ratings_total: 100,
            price_level: 2,
            types: ['restaurant', 'food'],
          },
        ],
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await searchNearbyPlaces(39.7392, -104.9903, 5000);

      expect(result.error).toBeNull();
      expect(result.results).toHaveLength(1);
      expect(result.results[0].name).toBe('Test Restaurant');
      expect(result.results[0].place_id).toBe('test-place-1');
    });

    it('should handle API errors gracefully', async () => {
      const mockResponse = {
        status: 'REQUEST_DENIED',
        error_message: 'Invalid API key',
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await searchNearbyPlaces(39.7392, -104.9903);

      expect(result.error).not.toBeNull();
      expect(result.results).toHaveLength(0);
      expect(result.error?.message).toContain('REQUEST_DENIED');
    });

    it('should handle zero results', async () => {
      const mockResponse = {
        status: 'ZERO_RESULTS',
        results: [],
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await searchNearbyPlaces(39.7392, -104.9903);

      expect(result.error).toBeNull();
      expect(result.results).toHaveLength(0);
    });

    it('should include keyword in search when provided', async () => {
      const mockResponse = {
        status: 'OK',
        results: [],
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await searchNearbyPlaces(39.7392, -104.9903, 5000, 'restaurant', 'pizza');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('keyword=pizza')
      );
    });
  });

  describe('getPlaceDetails', () => {
    it('should successfully retrieve place details', async () => {
      const mockResponse = {
        status: 'OK',
        result: {
          place_id: 'test-place-1',
          name: 'Test Restaurant',
          formatted_address: '123 Test St, Denver, CO 80202',
          formatted_phone_number: '(303) 555-1234',
          website: 'https://testrestaurant.com',
          rating: 4.5,
          user_ratings_total: 100,
          price_level: 2,
          opening_hours: {
            weekday_text: ['Monday: 11:00 AM - 10:00 PM'],
            open_now: true,
          },
          types: ['restaurant', 'italian_restaurant'],
          geometry: { location: { lat: 39.7392, lng: -104.9903 } },
          reviews: [
            {
              author_name: 'John Doe',
              rating: 5,
              text: 'Great food!',
              time: 1234567890,
            },
          ],
        },
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getPlaceDetails('test-place-1');

      expect(result.error).toBeNull();
      expect(result.details).not.toBeNull();
      expect(result.details?.name).toBe('Test Restaurant');
      expect(result.details?.rating).toBe(4.5);
      expect(result.details?.types).toContain('italian_restaurant');
    });

    it('should handle API errors', async () => {
      const mockResponse = {
        status: 'NOT_FOUND',
        error_message: 'Place not found',
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await getPlaceDetails('invalid-place-id');

      expect(result.error).not.toBeNull();
      expect(result.details).toBeNull();
    });

    it('should request all required fields', async () => {
      const mockResponse = {
        status: 'OK',
        result: {},
      };

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      await getPlaceDetails('test-place-1');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('fields=place_id,name,formatted_address')
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('reviews')
      );
    });
  });

  describe('populateRestaurants', () => {
    it('should handle empty results gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ZERO_RESULTS', results: [] }),
      } as Response);

      const result = await populateRestaurants(39.7392, -104.9903, 10, 100);

      expect(result.imported).toBe(0);
      expect(result.updated).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

      const result = await populateRestaurants(39.7392, -104.9903);

      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
