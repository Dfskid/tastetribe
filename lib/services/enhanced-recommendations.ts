import { createClient } from '@/lib/supabase/client';
import { adminService } from './admin';

export interface RecommendationParams {
  userId: string;
  category: string;
  limit?: number;
  excludeRated?: boolean;
  minRating?: number;
}

export interface RecommendationConfig {
  algorithm: 'collaborative_filtering' | 'content_based' | 'hybrid' | 'location_based';
  weights: {
    friend_similarity?: number;
    taste_profile?: number;
    popularity?: number;
    recency?: number;
    genre_match?: number;
    ratings?: number;
    trending?: number;
    location_proximity?: number;
    season?: number;
  };
  min_ratings: number;
}

export interface Item {
  id: string;
  category: string;
  name: string;
  attributes: Record<string, any>;
  recommendation_score?: number;
  recommendation_reason?: string;
}

export class EnhancedRecommendationEngine {
  private supabase = createClient();

  async getRecommendations(params: RecommendationParams): Promise<Item[]> {
    const category = await adminService.getCategory(params.category);

    if (!category) {
      throw new Error(`Category ${params.category} not found`);
    }

    const config = category.recommendation_config as RecommendationConfig;

    const testVariant = await this.getUserTestVariant(params.userId, params.category);
    if (testVariant) {
      config.weights = testVariant.weights;
    }

    switch (config.algorithm) {
      case 'collaborative_filtering':
        return this.collaborativeFiltering(params, config);
      case 'content_based':
        return this.contentBasedFiltering(params, config);
      case 'hybrid':
        return this.hybridFiltering(params, config);
      case 'location_based':
        return this.locationBasedFiltering(params, config);
      default:
        return this.collaborativeFiltering(params, config);
    }
  }

  private async collaborativeFiltering(
    params: RecommendationParams,
    config: RecommendationConfig
  ): Promise<Item[]> {
    const userRatings = await this.getUserRatings(params.userId);

    if (userRatings.length < config.min_ratings) {
      return this.fallbackToPopular(params);
    }

    const similarUsers = await this.findSimilarUsers(params.userId);

    const friendWeight = config.weights.friend_similarity || 0.4;
    const popularityWeight = config.weights.popularity || 0.3;
    const recencyWeight = config.weights.recency || 0.2;
    const tasteWeight = config.weights.taste_profile || 0.1;

    const { data: items } = await this.supabase
      .from('items')
      .select(`
        *,
        ratings:user_ratings(rating, user_id)
      `)
      .eq('category', params.category)
      .limit(params.limit || 20);

    if (!items) return [];

    const scoredItems = items.map(item => {
      let score = 0;

      const friendRatings = item.ratings?.filter((r: any) =>
        similarUsers.includes(r.user_id)
      ) || [];
      const friendScore = friendRatings.length > 0
        ? friendRatings.reduce((sum: number, r: any) => sum + r.rating, 0) / friendRatings.length / 5
        : 0;

      const avgRating = item.ratings?.length > 0
        ? item.ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / item.ratings.length / 5
        : 0;

      const recencyScore = this.calculateRecencyScore(item.created_at);

      const tasteScore = this.calculateTasteScore(userRatings, item);

      score = (
        friendScore * friendWeight +
        avgRating * popularityWeight +
        recencyScore * recencyWeight +
        tasteScore * tasteWeight
      );

      return {
        ...item,
        recommendation_score: score,
        recommendation_reason: this.generateReason(friendScore, friendRatings.length)
      };
    });

    if (params.excludeRated) {
      const ratedItemIds = userRatings.map(r => r.item_id);
      return scoredItems
        .filter(item => !ratedItemIds.includes(item.id))
        .sort((a, b) => (b.recommendation_score || 0) - (a.recommendation_score || 0))
        .slice(0, params.limit || 20);
    }

    return scoredItems
      .sort((a, b) => (b.recommendation_score || 0) - (a.recommendation_score || 0))
      .slice(0, params.limit || 20);
  }

  private async contentBasedFiltering(
    params: RecommendationParams,
    config: RecommendationConfig
  ): Promise<Item[]> {
    const userRatings = await this.getUserRatings(params.userId);

    if (userRatings.length < config.min_ratings) {
      return this.fallbackToPopular(params);
    }

    const favoriteGenres = this.extractFavoriteGenres(userRatings);

    const genreWeight = config.weights.genre_match || 0.35;
    const ratingWeight = config.weights.ratings || 0.25;
    const friendWeight = config.weights.friend_similarity || 0.25;
    const recencyWeight = config.weights.recency || 0.15;

    const { data: items } = await this.supabase
      .from('items')
      .select(`
        *,
        ratings:user_ratings(rating, user_id)
      `)
      .eq('category', params.category)
      .limit(params.limit ? params.limit * 2 : 40);

    if (!items) return [];

    const similarUsers = await this.findSimilarUsers(params.userId);

    const scoredItems = items.map(item => {
      let score = 0;

      const genreScore = this.calculateGenreMatch(item.attributes.genre_ids || [], favoriteGenres);

      const avgRating = item.ratings?.length > 0
        ? item.ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / item.ratings.length / 5
        : 0;

      const friendRatings = item.ratings?.filter((r: any) =>
        similarUsers.includes(r.user_id)
      ) || [];
      const friendScore = friendRatings.length > 0
        ? friendRatings.reduce((sum: number, r: any) => sum + r.rating, 0) / friendRatings.length / 5
        : 0;

      const recencyScore = this.calculateRecencyScore(item.created_at);

      score = (
        genreScore * genreWeight +
        avgRating * ratingWeight +
        friendScore * friendWeight +
        recencyScore * recencyWeight
      );

      return {
        ...item,
        recommendation_score: score,
        recommendation_reason: genreScore > 0.7 ? 'Matches your favorite genres' : 'Popular in your network'
      };
    });

    if (params.excludeRated) {
      const ratedItemIds = userRatings.map(r => r.item_id);
      return scoredItems
        .filter(item => !ratedItemIds.includes(item.id))
        .sort((a, b) => (b.recommendation_score || 0) - (a.recommendation_score || 0))
        .slice(0, params.limit || 20);
    }

    return scoredItems
      .sort((a, b) => (b.recommendation_score || 0) - (a.recommendation_score || 0))
      .slice(0, params.limit || 20);
  }

  private async hybridFiltering(
    params: RecommendationParams,
    config: RecommendationConfig
  ): Promise<Item[]> {
    const [collaborative, contentBased] = await Promise.all([
      this.collaborativeFiltering(params, {
        ...config,
        algorithm: 'collaborative_filtering'
      }),
      this.contentBasedFiltering(params, {
        ...config,
        algorithm: 'content_based'
      })
    ]);

    const hybridScores = new Map<string, { item: Item; score: number }>();

    collaborative.forEach((item, index) => {
      const score = (collaborative.length - index) / collaborative.length;
      hybridScores.set(item.id, { item, score: score * 0.5 });
    });

    contentBased.forEach((item, index) => {
      const score = (contentBased.length - index) / contentBased.length;
      const existing = hybridScores.get(item.id);
      if (existing) {
        existing.score += score * 0.5;
      } else {
        hybridScores.set(item.id, { item, score: score * 0.5 });
      }
    });

    return Array.from(hybridScores.values())
      .sort((a, b) => b.score - a.score)
      .map(({ item, score }) => ({
        ...item,
        recommendation_score: score
      }))
      .slice(0, params.limit || 20);
  }

  private async locationBasedFiltering(
    params: RecommendationParams,
    config: RecommendationConfig
  ): Promise<Item[]> {
    return this.collaborativeFiltering(params, config);
  }

  private async getUserRatings(userId: string): Promise<any[]> {
    const { data } = await this.supabase
      .from('user_ratings')
      .select(`
        *,
        item:items(*)
      `)
      .eq('user_id', userId)
      .gte('rating', 3);

    return data || [];
  }

  private async findSimilarUsers(userId: string): Promise<string[]> {
    const { data: friends } = await this.supabase
      .from('friendships')
      .select('friend_id')
      .eq('user_id', userId)
      .eq('status', 'accepted');

    return friends?.map(f => f.friend_id) || [];
  }

  private calculateRecencyScore(createdAt: string): number {
    const now = new Date().getTime();
    const created = new Date(createdAt).getTime();
    const daysSinceCreation = (now - created) / (1000 * 60 * 60 * 24);

    if (daysSinceCreation < 7) return 1.0;
    if (daysSinceCreation < 30) return 0.8;
    if (daysSinceCreation < 90) return 0.6;
    if (daysSinceCreation < 180) return 0.4;
    return 0.2;
  }

  private calculateTasteScore(userRatings: any[], item: Item): number {
    const ratedCategories = userRatings.map(r => r.item?.category);
    return ratedCategories.includes(item.category) ? 0.8 : 0.2;
  }

  private extractFavoriteGenres(userRatings: any[]): number[] {
    const genreCounts = new Map<number, number>();

    userRatings.forEach(rating => {
      const genres = rating.item?.attributes?.genre_ids || [];
      genres.forEach((genreId: number) => {
        genreCounts.set(genreId, (genreCounts.get(genreId) || 0) + rating.rating);
      });
    });

    return Array.from(genreCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genreId]) => genreId);
  }

  private calculateGenreMatch(itemGenres: number[], favoriteGenres: number[]): number {
    if (favoriteGenres.length === 0) return 0.5;

    const matches = itemGenres.filter(g => favoriteGenres.includes(g)).length;
    return matches / Math.max(itemGenres.length, favoriteGenres.length);
  }

  private generateReason(friendScore: number, friendCount: number): string {
    if (friendScore > 0.8 && friendCount > 0) {
      return `${friendCount} friend${friendCount > 1 ? 's' : ''} loved this`;
    }
    if (friendScore > 0.6) {
      return 'Popular among your friends';
    }
    return 'Recommended for you';
  }

  private async fallbackToPopular(params: RecommendationParams): Promise<Item[]> {
    const { data: items } = await this.supabase
      .from('items')
      .select(`
        *,
        ratings:user_ratings(rating)
      `)
      .eq('category', params.category)
      .limit(params.limit ? params.limit * 2 : 40);

    if (!items) return [];

    return items
      .map(item => ({
        ...item,
        recommendation_score: item.ratings?.length || 0
      }))
      .sort((a, b) => (b.recommendation_score || 0) - (a.recommendation_score || 0))
      .slice(0, params.limit || 20);
  }

  private async getUserTestVariant(userId: string, category: string): Promise<any> {
    const { data: activeTests } = await this.supabase
      .from('ab_tests')
      .select('*')
      .eq('category', category)
      .eq('active', true);

    if (!activeTests || activeTests.length === 0) return null;

    const test = activeTests[0];

    let { data: assignment } = await this.supabase
      .from('ab_test_assignments')
      .select('variant')
      .eq('test_id', test.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!assignment) {
      const variants = test.variants as any[];
      const randomVariant = this.selectVariantByTraffic(variants);

      await adminService.assignUserToTest(test.id, userId, randomVariant.name);

      return randomVariant.config;
    }

    const variant = (test.variants as any[]).find(v => v.name === assignment.variant);
    return variant?.config;
  }

  private selectVariantByTraffic(variants: any[]): any {
    const random = Math.random() * 100;
    let cumulative = 0;

    for (const variant of variants) {
      cumulative += variant.traffic_percentage;
      if (random <= cumulative) {
        return variant;
      }
    }

    return variants[0];
  }
}

export const enhancedRecommendationEngine = new EnhancedRecommendationEngine();
