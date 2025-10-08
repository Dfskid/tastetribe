interface CacheEntry<T> {
  data: T;
  expiry: number;
}

export class CacheService {
  private cache: Map<string, CacheEntry<any>>;
  private defaultTTL: number;

  constructor(defaultTTLSeconds: number = 300) {
    this.cache = new Map();
    this.defaultTTL = defaultTTLSeconds * 1000;
    this.startCleanupInterval();
  }

  set<T>(key: string, data: T, ttlSeconds?: number): void {
    const ttl = ttlSeconds ? ttlSeconds * 1000 : this.defaultTTL;
    const expiry = Date.now() + ttl;

    this.cache.set(key, { data, expiry });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    const cached = this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    const data = await fetchFn();
    this.set(key, data, ttlSeconds);
    return data;
  }

  invalidatePattern(pattern: string): number {
    let deletedCount = 0;
    const regex = new RegExp(pattern);
    const keysToDelete: string[] = [];

    this.cache.forEach((_, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      deletedCount++;
    });

    return deletedCount;
  }

  getStats(): {
    size: number;
    keys: string[];
    memoryEstimate: string;
  } {
    const keys = Array.from(this.cache.keys());
    const memoryBytes = JSON.stringify(Array.from(this.cache.entries())).length;
    const memoryMB = (memoryBytes / 1024 / 1024).toFixed(2);

    return {
      size: this.cache.size,
      keys,
      memoryEstimate: `${memoryMB} MB`
    };
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];

      this.cache.forEach((entry, key) => {
        if (now > entry.expiry) {
          keysToDelete.push(key);
        }
      });

      keysToDelete.forEach(key => {
        this.cache.delete(key);
      });
    }, 60000);
  }
}

export const recommendationCache = new CacheService(600);

export const userCache = new CacheService(300);

export const categoryCache = new CacheService(1800);

export function generateCacheKey(prefix: string, ...parts: (string | number)[]): string {
  return `${prefix}:${parts.join(':')}`;
}

export async function getCachedRecommendations<T>(
  userId: string,
  category: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 600
): Promise<T> {
  const key = generateCacheKey('recommendations', userId, category);
  return recommendationCache.getOrSet(key, fetchFn, ttlSeconds);
}

export function invalidateUserCache(userId: string): void {
  recommendationCache.invalidatePattern(`recommendations:${userId}:.*`);
  userCache.invalidatePattern(`user:${userId}:.*`);
}

export function invalidateCategoryCache(category: string): void {
  recommendationCache.invalidatePattern(`recommendations:.*:${category}`);
  categoryCache.delete(`category:${category}`);
}
