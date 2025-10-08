/**
 * Analytics Service
 *
 * Provides event tracking and analytics for user behavior, conversions,
 * and growth metrics. Compatible with Google Analytics 4 and custom tracking.
 * Includes database-backed KPI tracking for comprehensive analytics.
 */

import { supabase } from '@/lib/supabase/client';

type AnalyticsEvent = {
  event: string;
  category?: string;
  label?: string;
  value?: number;
  [key: string]: any;
};

export interface KPIData {
  date: string;
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  totalInvitesSent: number;
  invitesAccepted: number;
  totalRatings: number;
  totalFriendships: number;
  viralCoefficient: number;
  friendAcceptanceRate: number;
  avgRatingsPerUser: number;
}

export interface RetentionData {
  cohortDate: string;
  cohortSize: number;
  day1Retained: number;
  day7Retained: number;
  day30Retained: number;
  retention1Day: number;
  retention7Day: number;
  retention30Day: number;
}

class AnalyticsService {
  private isInitialized = false;
  private eventQueue: AnalyticsEvent[] = [];
  private sessionId: string;

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
  }

  private getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return '';

    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  initialize(trackingId?: string) {
    if (typeof window === 'undefined') return;

    if (trackingId && !this.isInitialized) {
      const script = document.createElement('script');
      script.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
      script.async = true;
      document.head.appendChild(script);

      (window as any).dataLayer = (window as any).dataLayer || [];
      (window as any).gtag = function() {
        (window as any).dataLayer.push(arguments);
      };
      (window as any).gtag('js', new Date());
      (window as any).gtag('config', trackingId);

      this.isInitialized = true;

      this.eventQueue.forEach(event => this.trackEvent(event));
      this.eventQueue = [];
    }
  }

  trackEvent(event: AnalyticsEvent) {
    if (typeof window === 'undefined') return;

    if (!this.isInitialized) {
      this.eventQueue.push(event);
      return;
    }

    if ((window as any).gtag) {
      (window as any).gtag('event', event.event, {
        event_category: event.category,
        event_label: event.label,
        value: event.value,
        ...event,
      });
    }

    console.log('[Analytics]', event);
  }

  trackPageView(path: string, title?: string) {
    this.trackEvent({
      event: 'page_view',
      page_path: path,
      page_title: title || document.title,
    });
  }

  trackUserSignup(method: string) {
    this.trackEvent({
      event: 'sign_up',
      category: 'engagement',
      method,
    });
  }

  trackUserLogin(method: string) {
    this.trackEvent({
      event: 'login',
      category: 'engagement',
      method,
    });
  }

  trackRating(itemId: string, rating: number, itemType: string = 'restaurant') {
    this.trackEvent({
      event: 'rate_item',
      category: 'engagement',
      item_id: itemId,
      item_type: itemType,
      rating,
      value: rating,
    });
  }

  trackRecommendationView(itemId: string, position: number, sessionId: string) {
    this.trackEvent({
      event: 'view_recommendation',
      category: 'discovery',
      item_id: itemId,
      position,
      session_id: sessionId,
    });
  }

  trackRecommendationClick(itemId: string, position: number, sessionId: string) {
    this.trackEvent({
      event: 'click_recommendation',
      category: 'discovery',
      item_id: itemId,
      position,
      session_id: sessionId,
    });
  }

  trackInviteSent(method: string, inviteeCount: number = 1) {
    this.trackEvent({
      event: 'invite_sent',
      category: 'viral_growth',
      method,
      invitee_count: inviteeCount,
    });
  }

  trackInviteAccepted(invitationCode: string) {
    this.trackEvent({
      event: 'invite_accepted',
      category: 'viral_growth',
      invitation_code: invitationCode,
    });
  }

  trackFriendAdded(friendId: string) {
    this.trackEvent({
      event: 'friend_added',
      category: 'social',
      friend_id: friendId,
    });
  }

  trackSharePromptShown(promptType: string, context?: any) {
    this.trackEvent({
      event: 'share_prompt_shown',
      category: 'viral_growth',
      prompt_type: promptType,
      context,
    });
  }

  trackSharePromptAction(promptType: string, action: 'shared' | 'dismissed') {
    this.trackEvent({
      event: 'share_prompt_action',
      category: 'viral_growth',
      prompt_type: promptType,
      action,
    });
  }

  trackAchievementUnlocked(achievementType: string, progress: number) {
    this.trackEvent({
      event: 'achievement_unlocked',
      category: 'gamification',
      achievement_type: achievementType,
      progress,
    });
  }

  trackRewardClaimed(rewardType: string, rewardValue: string) {
    this.trackEvent({
      event: 'reward_claimed',
      category: 'gamification',
      reward_type: rewardType,
      reward_value: rewardValue,
    });
  }

  trackSearch(query: string, resultsCount: number) {
    this.trackEvent({
      event: 'search',
      category: 'discovery',
      search_term: query,
      results_count: resultsCount,
    });
  }

  trackFilterApplied(filterType: string, filterValue: string) {
    this.trackEvent({
      event: 'filter_applied',
      category: 'discovery',
      filter_type: filterType,
      filter_value: filterValue,
    });
  }

  trackError(errorMessage: string, errorContext?: any) {
    this.trackEvent({
      event: 'error',
      category: 'technical',
      error_message: errorMessage,
      error_context: errorContext,
    });
  }

  setUserId(userId: string) {
    if (typeof window === 'undefined') return;

    if ((window as any).gtag) {
      (window as any).gtag('set', { user_id: userId });
    }
  }

  setUserProperties(properties: Record<string, any>) {
    if (typeof window === 'undefined') return;

    if ((window as any).gtag) {
      (window as any).gtag('set', 'user_properties', properties);
    }
  }

  async trackEventToDatabase(eventType: string, eventCategory: string, metadata?: Record<string, any>): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.rpc('track_event', {
        p_user_id: user.id,
        p_event_type: eventType,
        p_event_category: eventCategory,
        p_metadata: metadata || null,
        p_session_id: this.sessionId,
      });
    } catch (error) {
      console.error('Database tracking error:', error);
    }
  }

  async getDailyKPIs(startDate: string, endDate: string): Promise<KPIData[]> {
    const { data, error } = await supabase
      .from('daily_kpis')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) {
      console.error('Failed to fetch KPIs:', error);
      return [];
    }

    return (data || []).map((row) => ({
      date: row.date,
      totalUsers: row.total_users,
      newUsers: row.new_users,
      activeUsers: row.active_users,
      totalInvitesSent: row.total_invites_sent,
      invitesAccepted: row.invites_accepted,
      totalRatings: row.total_ratings,
      totalFriendships: row.total_friendships,
      viralCoefficient: row.viral_coefficient,
      friendAcceptanceRate: row.friend_acceptance_rate,
      avgRatingsPerUser: row.avg_ratings_per_user,
    }));
  }

  async getRetentionData(startDate: string, endDate: string): Promise<RetentionData[]> {
    const { data, error } = await supabase
      .from('retention_cohorts')
      .select('*')
      .gte('cohort_date', startDate)
      .lte('cohort_date', endDate)
      .order('cohort_date', { ascending: true });

    if (error) {
      console.error('Failed to fetch retention data:', error);
      return [];
    }

    return (data || []).map((row) => ({
      cohortDate: row.cohort_date,
      cohortSize: row.cohort_size,
      day1Retained: row.day_1_retained,
      day7Retained: row.day_7_retained,
      day30Retained: row.day_30_retained,
      retention1Day: row.retention_1_day,
      retention7Day: row.retention_7_day,
      retention30Day: row.retention_30_day,
    }));
  }

  async aggregateDailyKPIs(date: string): Promise<void> {
    try {
      await supabase.rpc('aggregate_daily_kpis', {
        target_date: date,
      });
    } catch (error) {
      console.error('Failed to aggregate KPIs:', error);
    }
  }

  async updateRetentionCohorts(date: string): Promise<void> {
    try {
      await supabase.rpc('update_retention_cohorts', {
        target_date: date,
      });
    } catch (error) {
      console.error('Failed to update retention cohorts:', error);
    }
  }
}

export const analytics = new AnalyticsService();

if (typeof window !== 'undefined') {
  const trackingId = process.env.NEXT_PUBLIC_GA_TRACKING_ID;
  if (trackingId) {
    analytics.initialize(trackingId);
  }
}
