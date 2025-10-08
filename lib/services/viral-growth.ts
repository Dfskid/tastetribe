import { supabase } from '@/lib/supabase/client';

export type RewardType = 'unlock_feature' | 'bonus_recommendations' | 'premium_trial' | 'achievement_badge';
export type AchievementType =
  | 'first_rating'
  | 'invite_3_friends'
  | 'invite_5_friends'
  | 'invite_10_friends'
  | 'taste_master'
  | 'social_butterfly'
  | 'explorer'
  | 'early_adopter'
  | 'ratings_milestone_10'
  | 'ratings_milestone_50'
  | 'ratings_milestone_100';

export type ViralMetricType =
  | 'invitation_sent'
  | 'invitation_accepted'
  | 'friend_activated'
  | 'share_completed'
  | 'share_prompt_shown'
  | 'share_prompt_clicked';

export type SharePromptType =
  | 'after_rating'
  | 'discover_moment'
  | 'achievement_unlock'
  | 'milestone_reached'
  | 'onboarding_complete';

export interface ReferralReward {
  id: string;
  user_id: string;
  reward_type: RewardType;
  reward_value: string;
  invitation_id: string | null;
  earned_at: string;
  claimed: boolean;
  expires_at: string | null;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_type: AchievementType;
  achievement_name: string;
  achievement_description: string;
  progress: number;
  target: number;
  completed: boolean;
  completed_at: string | null;
  reward_id: string | null;
}

export interface ViralMetric {
  id: string;
  user_id: string;
  metric_type: ViralMetricType;
  context: Record<string, any>;
  value: number;
  created_at: string;
}

export async function getUnclaimedRewards(): Promise<{
  rewards: ReferralReward[];
  error: Error | null;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('referral_rewards')
      .select('*')
      .eq('user_id', user.id)
      .eq('claimed', false)
      .order('earned_at', { ascending: false });

    if (error) throw error;

    return { rewards: (data || []) as ReferralReward[], error: null };
  } catch (error) {
    console.error('Error getting unclaimed rewards:', error);
    return { rewards: [], error: error as Error };
  }
}

export async function claimReward(rewardId: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('referral_rewards')
      .update({ claimed: true } as any)
      .eq('id', rewardId)
      .eq('user_id', user.id);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    console.error('Error claiming reward:', error);
    return { success: false, error: error as Error };
  }
}

export async function getUserAchievements(): Promise<{
  achievements: UserAchievement[];
  error: Error | null;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', user.id)
      .order('completed', { ascending: false })
      .order('progress', { ascending: false });

    if (error) throw error;

    return { achievements: (data || []) as UserAchievement[], error: null };
  } catch (error) {
    console.error('Error getting achievements:', error);
    return { achievements: [], error: error as Error };
  }
}

export async function trackViralMetric(
  metricType: ViralMetricType,
  context?: Record<string, any>,
  value: number = 1
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('viral_metrics')
      .insert({
        user_id: user.id,
        metric_type: metricType,
        context: context || {},
        value,
      } as any);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    console.error('Error tracking viral metric:', error);
    return { success: false, error: error as Error };
  }
}

export async function trackSharePrompt(
  promptType: SharePromptType,
  context?: Record<string, any>
): Promise<{ promptId: string | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('share_prompts')
      .insert({
        user_id: user.id,
        prompt_type: promptType,
        prompt_context: context || {},
      } as any)
      .select()
      .single();

    if (error) throw error;

    await trackViralMetric('share_prompt_shown', { prompt_type: promptType });

    return { promptId: data?.id || null, error: null };
  } catch (error) {
    console.error('Error tracking share prompt:', error);
    return { promptId: null, error: error as Error };
  }
}

export async function updateSharePromptAction(
  promptId: string,
  action: 'shared' | 'dismissed' | 'ignored',
  shareMethod?: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('share_prompts')
      .update({
        action_taken: action,
        share_method: shareMethod,
      } as any)
      .eq('id', promptId)
      .eq('user_id', user.id);

    if (error) throw error;

    if (action === 'shared') {
      await trackViralMetric('share_prompt_clicked', {
        share_method: shareMethod,
        prompt_id: promptId
      });
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error updating share prompt action:', error);
    return { success: false, error: error as Error };
  }
}

export async function getInvitationProgress(): Promise<{
  acceptedCount: number;
  nextMilestone: { target: number; reward: string } | null;
  error: Error | null;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: friendsData } = await supabase.rpc('get_friend_count', {
      user_uuid: user.id,
    });

    const acceptedCount = friendsData || 0;

    let nextMilestone = null;
    if (acceptedCount < 3) {
      nextMilestone = { target: 3, reward: 'Advanced taste matching' };
    } else if (acceptedCount < 5) {
      nextMilestone = { target: 5, reward: 'Enhanced recommendations' };
    } else if (acceptedCount < 10) {
      nextMilestone = { target: 10, reward: 'Premium trial access' };
    }

    return { acceptedCount, nextMilestone, error: null };
  } catch (error) {
    console.error('Error getting invitation progress:', error);
    return { acceptedCount: 0, nextMilestone: null, error: error as Error };
  }
}

export function generateShareableInviteLink(invitationCode: string): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return `${baseUrl}/invite/${invitationCode}`;
}

export function generateShareText(inviterName: string, invitationCode: string): {
  emailSubject: string;
  emailBody: string;
  smsText: string;
  socialText: string;
} {
  const inviteLink = generateShareableInviteLink(invitationCode);

  return {
    emailSubject: `${inviterName} invited you to TasteTribe!`,
    emailBody: `Hey! I've been using TasteTribe to discover amazing restaurants and I think you'd love it too.\n\nJoin me and get personalized recommendations based on your taste:\n${inviteLink}\n\nSee you there!\n- ${inviterName}`,
    smsText: `Hey! Join me on TasteTribe to discover great restaurants together: ${inviteLink}`,
    socialText: `Just discovered some amazing restaurants on TasteTribe! Join me: ${inviteLink}`,
  };
}

export async function shouldShowSharePrompt(
  promptType: SharePromptType
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('share_prompts')
      .select('shown_at')
      .eq('user_id', user.id)
      .eq('prompt_type', promptType)
      .order('shown_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error checking share prompt:', error);
      return true;
    }

    if (!data) return true;

    const lastShown = new Date(data.shown_at);
    const now = new Date();
    const hoursSinceLastShown = (now.getTime() - lastShown.getTime()) / (1000 * 60 * 60);

    return hoursSinceLastShown >= 24;
  } catch (error) {
    console.error('Error in shouldShowSharePrompt:', error);
    return false;
  }
}

export async function getViralCoefficient(
  days: number = 30
): Promise<{ coefficient: number; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: sent } = await supabase
      .from('viral_metrics')
      .select('value')
      .eq('user_id', user.id)
      .eq('metric_type', 'invitation_sent')
      .gte('created_at', startDate.toISOString());

    const { data: accepted } = await supabase
      .from('viral_metrics')
      .select('value')
      .eq('user_id', user.id)
      .eq('metric_type', 'invitation_accepted')
      .gte('created_at', startDate.toISOString());

    const totalSent = sent?.reduce((sum, m) => sum + m.value, 0) || 0;
    const totalAccepted = accepted?.reduce((sum, m) => sum + m.value, 0) || 0;

    const coefficient = totalSent > 0 ? totalAccepted / totalSent : 0;

    return { coefficient, error: null };
  } catch (error) {
    console.error('Error calculating viral coefficient:', error);
    return { coefficient: 0, error: error as Error };
  }
}
