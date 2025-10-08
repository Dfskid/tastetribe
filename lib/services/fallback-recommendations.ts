import { supabase } from '@/lib/supabase/client';

export interface RecommendationResult {
  id: string;
  name: string;
  category: string;
  attributes: Record<string, any>;
  score: number;
  source: 'friends' | 'trending' | 'popular' | 'nearby' | 'new';
}

export class FallbackRecommendationService {
  async getRecommendations(
    userId: string,
    limit: number = 10,
    latitude?: number,
    longitude?: number
  ): Promise<RecommendationResult[]> {
    const friendRecs = await this.getFriendRecommendations(userId, limit);

    if (friendRecs.length >= limit) {
      return friendRecs;
    }

    const needed = limit - friendRecs.length;
    const fallbackRecs = await this.getFallbackRecommendations(
      userId,
      needed,
      latitude,
      longitude
    );

    return [...friendRecs, ...fallbackRecs];
  }

  private async getFriendRecommendations(
    userId: string,
    limit: number
  ): Promise<RecommendationResult[]> {
    try {
      const { data, error } = await supabase.rpc('get_safe_recommendations', {
        p_user_id: userId,
        p_limit: limit,
      });

      if (error || !data) return [];

      return data.map((item: any) => ({
        id: item.item_id,
        name: item.item_name,
        category: 'restaurant',
        attributes: {},
        score: item.score,
        source: 'friends' as const,
      }));
    } catch (error) {
      console.error('Friend recommendations failed:', error);
      return [];
    }
  }

  private async getFallbackRecommendations(
    userId: string,
    limit: number,
    latitude?: number,
    longitude?: number
  ): Promise<RecommendationResult[]> {
    const strategies = [
      () => this.getTrendingItems(userId, Math.ceil(limit / 3)),
      () => this.getPopularItems(userId, Math.ceil(limit / 3)),
      () => this.getNearbyItems(userId, Math.ceil(limit / 3), latitude, longitude),
    ];

    const results = await Promise.all(strategies.map(fn => fn()));
    const combined = results.flat();

    const unique = Array.from(
      new Map(combined.map(item => [item.id, item])).values()
    );

    return unique.slice(0, limit);
  }

  private async getTrendingItems(
    userId: string,
    limit: number
  ): Promise<RecommendationResult[]> {
    try {
      const { data, error } = await supabase
        .from('trending_items')
        .select(`
          item_id,
          items!inner(id, name, category, attributes)
        `)
        .order('score', { ascending: false })
        .limit(limit);

      if (error || !data) return [];

      return data.map((row: any) => ({
        id: row.items.id,
        name: row.items.name,
        category: row.items.category,
        attributes: row.items.attributes || {},
        score: 0.8,
        source: 'trending' as const,
      }));
    } catch (error) {
      console.error('Trending items failed:', error);
      return [];
    }
  }

  private async getPopularItems(
    userId: string,
    limit: number
  ): Promise<RecommendationResult[]> {
    try {
      const { data, error } = await supabase
        .from('user_ratings')
        .select(`
          item_id,
          items!inner(id, name, category, attributes)
        `)
        .not('user_id', 'eq', userId)
        .gte('rating', 4)
        .limit(limit * 2);

      if (error || !data) return [];

      const itemScores = new Map<string, { item: any; count: number; avgRating: number }>();

      data.forEach((row: any) => {
        const existing = itemScores.get(row.item_id);
        if (existing) {
          existing.count++;
        } else {
          itemScores.set(row.item_id, {
            item: row.items,
            count: 1,
            avgRating: 0,
          });
        }
      });

      const sorted = Array.from(itemScores.entries())
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, limit);

      return sorted.map(([id, { item, count }]) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        attributes: item.attributes || {},
        score: Math.min(count / 10, 1),
        source: 'popular' as const,
      }));
    } catch (error) {
      console.error('Popular items failed:', error);
      return [];
    }
  }

  private async getNearbyItems(
    userId: string,
    limit: number,
    latitude?: number,
    longitude?: number
  ): Promise<RecommendationResult[]> {
    if (!latitude || !longitude) return [];

    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .not('id', 'in', `(
          SELECT item_id FROM user_ratings WHERE user_id = '${userId}'
        )`)
        .limit(limit * 2);

      if (error || !data) return [];

      const withDistances = data
        .filter(item => item.location)
        .map(item => ({
          ...item,
          distance: this.calculateDistance(
            latitude,
            longitude,
            item.location.coordinates[1],
            item.location.coordinates[0]
          ),
        }))
        .filter(item => item.distance <= 10)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit);

      return withDistances.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        attributes: item.attributes || {},
        score: Math.max(0, 1 - item.distance / 10),
        source: 'nearby' as const,
      }));
    } catch (error) {
      console.error('Nearby items failed:', error);
      return [];
    }
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  async getRecommendationsForNewUser(
    limit: number = 10,
    latitude?: number,
    longitude?: number
  ): Promise<RecommendationResult[]> {
    const strategies = [
      () => this.getTopRatedItems(Math.ceil(limit / 2)),
      () => this.getNewItems(Math.ceil(limit / 4)),
      () => this.getNearbyItemsForNewUser(Math.ceil(limit / 4), latitude, longitude),
    ];

    const results = await Promise.all(strategies.map(fn => fn()));
    const combined = results.flat();

    const unique = Array.from(
      new Map(combined.map(item => [item.id, item])).values()
    );

    return unique.slice(0, limit);
  }

  private async getTopRatedItems(limit: number): Promise<RecommendationResult[]> {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .gte('attributes->google_rating', 4.0)
        .order('attributes->google_rating', { ascending: false })
        .limit(limit);

      if (error || !data) return [];

      return data.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        attributes: item.attributes || {},
        score: item.attributes?.google_rating / 5 || 0.8,
        source: 'popular' as const,
      }));
    } catch (error) {
      console.error('Top rated items failed:', error);
      return [];
    }
  }

  private async getNewItems(limit: number): Promise<RecommendationResult[]> {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error || !data) return [];

      return data.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        attributes: item.attributes || {},
        score: 0.7,
        source: 'new' as const,
      }));
    } catch (error) {
      console.error('New items failed:', error);
      return [];
    }
  }

  private async getNearbyItemsForNewUser(
    limit: number,
    latitude?: number,
    longitude?: number
  ): Promise<RecommendationResult[]> {
    if (!latitude || !longitude) return [];

    return this.getNearbyItems('', limit, latitude, longitude);
  }
}

export const fallbackRecommendations = new FallbackRecommendationService();