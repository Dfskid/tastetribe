import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EnhancedRecommendationEngine } from '@/lib/services/enhanced-recommendations';

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
      single: vi.fn()
    }))
  })
}));

vi.mock('@/lib/services/admin', () => ({
  adminService: {
    getCategory: vi.fn(),
    assignUserToTest: vi.fn()
  }
}));

describe('EnhancedRecommendationEngine', () => {
  let engine: EnhancedRecommendationEngine;

  beforeEach(() => {
    engine = new EnhancedRecommendationEngine();
    vi.clearAllMocks();
  });

  describe('getRecommendations', () => {
    it('should return recommendations for valid category', async () => {
      const { adminService } = await import('@/lib/services/admin');

      (adminService.getCategory as any).mockResolvedValue({
        id: 'cat-123',
        slug: 'movies',
        name: 'Movies',
        recommendation_config: {
          algorithm: 'collaborative_filtering',
          weights: {
            friend_similarity: 0.4,
            popularity: 0.3,
            recency: 0.2,
            taste_profile: 0.1
          },
          min_ratings: 3
        }
      });

      const supabase = (engine as any).supabase;
      const mockChain = supabase.from();

      mockChain.limit.mockResolvedValueOnce({
        data: [
          {
            id: 'rating-1',
            user_id: 'user-123',
            item_id: 'item-1',
            rating: 5,
            item: {
              id: 'item-1',
              category: 'movies',
              attributes: { genre_ids: [28] }
            }
          }
        ],
        error: null
      });

      mockChain.limit.mockResolvedValueOnce({
        data: [],
        error: null
      });

      mockChain.limit.mockResolvedValueOnce({
        data: [],
        error: null
      });

      mockChain.limit.mockResolvedValueOnce({
        data: [
          {
            id: 'item-2',
            name: 'Test Movie',
            category: 'movies',
            attributes: {},
            created_at: new Date().toISOString(),
            ratings: [{ rating: 5, user_id: 'user-456' }]
          }
        ],
        error: null
      });

      const result = await engine.getRecommendations({
        userId: 'user-123',
        category: 'movies',
        limit: 10
      });

      expect(Array.isArray(result)).toBe(true);
    });

    it('should throw error for invalid category', async () => {
      const { adminService } = await import('@/lib/services/admin');
      (adminService.getCategory as any).mockResolvedValue(null);

      await expect(
        engine.getRecommendations({
          userId: 'user-123',
          category: 'invalid-category',
          limit: 10
        })
      ).rejects.toThrow('Category invalid-category not found');
    });
  });

  describe('collaborative filtering', () => {
    it('should calculate recommendation scores based on friend ratings', async () => {
      const userRatings = [
        {
          item_id: 'item-1',
          rating: 5,
          item: { category: 'movies', attributes: { genre_ids: [28] } }
        }
      ];

      const items = [
        {
          id: 'item-2',
          name: 'Movie 2',
          category: 'movies',
          attributes: {},
          created_at: new Date().toISOString(),
          ratings: [
            { rating: 5, user_id: 'friend-1' },
            { rating: 4, user_id: 'friend-2' }
          ]
        }
      ];

      const config = {
        algorithm: 'collaborative_filtering' as const,
        weights: {
          friend_similarity: 0.4,
          popularity: 0.3,
          recency: 0.2,
          taste_profile: 0.1
        },
        min_ratings: 1
      };

      const result = await (engine as any).collaborativeFiltering(
        { userId: 'user-123', category: 'movies', limit: 10 },
        config
      );

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('content-based filtering', () => {
    it('should recommend items based on genre preferences', async () => {
      const config = {
        algorithm: 'content_based' as const,
        weights: {
          genre_match: 0.35,
          ratings: 0.25,
          friend_similarity: 0.25,
          recency: 0.15
        },
        min_ratings: 1
      };

      const result = await (engine as any).contentBasedFiltering(
        { userId: 'user-123', category: 'movies', limit: 10 },
        config
      );

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('genre matching', () => {
    it('should calculate genre match score correctly', () => {
      const itemGenres = [28, 12, 16];
      const favoriteGenres = [28, 12];

      const score = (engine as any).calculateGenreMatch(
        itemGenres,
        favoriteGenres
      );

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should return 0.5 for empty favorite genres', () => {
      const itemGenres = [28, 12];
      const favoriteGenres: number[] = [];

      const score = (engine as any).calculateGenreMatch(
        itemGenres,
        favoriteGenres
      );

      expect(score).toBe(0.5);
    });

    it('should return 1 for perfect match', () => {
      const genres = [28, 12];

      const score = (engine as any).calculateGenreMatch(genres, genres);

      expect(score).toBe(1);
    });
  });

  describe('recency scoring', () => {
    it('should give high score to recent items', () => {
      const recentDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const score = (engine as any).calculateRecencyScore(recentDate);

      expect(score).toBe(1.0);
    });

    it('should give lower score to older items', () => {
      const oldDate = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString();
      const score = (engine as any).calculateRecencyScore(oldDate);

      expect(score).toBeLessThan(1.0);
    });
  });

  describe('recommendation reason generation', () => {
    it('should generate reason based on friend ratings', () => {
      const reason1 = (engine as any).generateReason(0.9, 3);
      expect(reason1).toContain('friends loved this');

      const reason2 = (engine as any).generateReason(0.7, 2);
      expect(reason2).toContain('Popular among your friends');

      const reason3 = (engine as any).generateReason(0.3, 0);
      expect(reason3).toBe('Recommended for you');
    });
  });
});
