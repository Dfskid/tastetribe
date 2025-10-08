interface FeatureFlags {
  enableInviteSystem: boolean;
  enableSocialFeed: boolean;
  enableGamification: boolean;
  enableAdvancedRecommendations: boolean;
  enablePushNotifications: boolean;
  enableEmailNotifications: boolean;
  enableLocationTracking: boolean;
  enableMoviesCategory: boolean;
  enablePartnerAPI: boolean;
  maxInvitesPerDay: number;
  maxRatingsPerDay: number;
  recommendationCacheTimeMinutes: number;
}

const DEFAULT_FLAGS: FeatureFlags = {
  enableInviteSystem: true,
  enableSocialFeed: true,
  enableGamification: true,
  enableAdvancedRecommendations: true,
  enablePushNotifications: false,
  enableEmailNotifications: true,
  enableLocationTracking: true,
  enableMoviesCategory: true,
  enablePartnerAPI: false,
  maxInvitesPerDay: 20,
  maxRatingsPerDay: 50,
  recommendationCacheTimeMinutes: 30,
};

const PRODUCTION_FLAGS: FeatureFlags = {
  ...DEFAULT_FLAGS,
  enablePushNotifications: false,
  enablePartnerAPI: false,
  maxInvitesPerDay: 10,
  maxRatingsPerDay: 30,
};

const ALPHA_FLAGS: FeatureFlags = {
  ...DEFAULT_FLAGS,
  enableGamification: false,
  enablePartnerAPI: false,
  maxInvitesPerDay: 15,
};

class FeatureFlagService {
  private flags: FeatureFlags;
  private environment: 'development' | 'alpha' | 'production';

  constructor() {
    this.environment = this.getEnvironment();
    this.flags = this.loadFlags();
  }

  private getEnvironment(): 'development' | 'alpha' | 'production' {
    const env = process.env.NEXT_PUBLIC_ENVIRONMENT || 'development';
    return env as 'development' | 'alpha' | 'production';
  }

  private loadFlags(): FeatureFlags {
    switch (this.environment) {
      case 'production':
        return PRODUCTION_FLAGS;
      case 'alpha':
        return ALPHA_FLAGS;
      default:
        return DEFAULT_FLAGS;
    }
  }

  isEnabled(flagName: keyof FeatureFlags): boolean {
    const value = this.flags[flagName];
    return typeof value === 'boolean' ? value : false;
  }

  getNumericValue(flagName: keyof FeatureFlags): number {
    const value = this.flags[flagName];
    return typeof value === 'number' ? value : 0;
  }

  getAllFlags(): Readonly<FeatureFlags> {
    return { ...this.flags };
  }

  updateFlag(flagName: keyof FeatureFlags, value: boolean | number): void {
    if (this.environment === 'development') {
      (this.flags[flagName] as any) = value;
      console.log(`Feature flag updated: ${flagName} = ${value}`);
    } else {
      console.warn('Cannot update feature flags in non-development environment');
    }
  }

  getCurrentEnvironment(): string {
    return this.environment;
  }
}

export const featureFlags = new FeatureFlagService();

export function useFeatureFlag(flagName: keyof FeatureFlags): boolean {
  return featureFlags.isEnabled(flagName);
}

export function withFeatureFlag<T>(
  flagName: keyof FeatureFlags,
  component: T,
  fallback: T | null = null
): T | null {
  return featureFlags.isEnabled(flagName) ? component : fallback;
}