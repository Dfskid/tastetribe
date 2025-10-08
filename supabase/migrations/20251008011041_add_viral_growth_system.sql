-- Viral Growth System - Incentivized Invitations & Gamification
--
-- Overview:
-- This migration implements a comprehensive viral growth system with incentivized
-- invitations, referral rewards, achievement tracking, and growth analytics.
--
-- New Tables:
-- 1. referral_rewards - Track and manage referral rewards for users
-- 2. user_achievements - Gamification system for engagement
-- 3. viral_metrics - Track viral growth performance
-- 4. share_prompts - Track contextual sharing prompts and effectiveness
-- 5. user_milestones - Track user progress and trigger rewards

-- Create custom types for enums
DO $$ BEGIN
  CREATE TYPE reward_type AS ENUM ('unlock_feature', 'bonus_recommendations', 'premium_trial', 'achievement_badge');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE achievement_type AS ENUM (
    'first_rating',
    'invite_3_friends',
    'invite_5_friends',
    'invite_10_friends',
    'taste_master',
    'social_butterfly',
    'explorer',
    'early_adopter',
    'ratings_milestone_10',
    'ratings_milestone_50',
    'ratings_milestone_100'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE viral_metric_type AS ENUM (
    'invitation_sent',
    'invitation_accepted',
    'friend_activated',
    'share_completed',
    'share_prompt_shown',
    'share_prompt_clicked'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE share_prompt_type AS ENUM (
    'after_rating',
    'discover_moment',
    'achievement_unlock',
    'milestone_reached',
    'onboarding_complete'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE share_action AS ENUM ('shared', 'dismissed', 'ignored');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE milestone_type AS ENUM (
    'ratings_count',
    'friends_count',
    'items_discovered',
    'days_active'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create referral_rewards table
CREATE TABLE IF NOT EXISTS referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reward_type reward_type NOT NULL,
  reward_value text NOT NULL,
  invitation_id uuid REFERENCES invitations(id) ON DELETE SET NULL,
  earned_at timestamptz DEFAULT now(),
  claimed boolean DEFAULT false,
  expires_at timestamptz
);

-- Create user_achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_type achievement_type NOT NULL,
  achievement_name text NOT NULL,
  achievement_description text NOT NULL,
  progress integer DEFAULT 0,
  target integer NOT NULL,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  reward_id uuid REFERENCES referral_rewards(id) ON DELETE SET NULL,
  CONSTRAINT unique_user_achievement UNIQUE (user_id, achievement_type)
);

-- Create viral_metrics table
CREATE TABLE IF NOT EXISTS viral_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  metric_type viral_metric_type NOT NULL,
  context jsonb DEFAULT '{}'::jsonb,
  value integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Create share_prompts table
CREATE TABLE IF NOT EXISTS share_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  prompt_type share_prompt_type NOT NULL,
  prompt_context jsonb DEFAULT '{}'::jsonb,
  shown_at timestamptz DEFAULT now(),
  action_taken share_action,
  share_method text
);

-- Create user_milestones table
CREATE TABLE IF NOT EXISTS user_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  milestone_type milestone_type NOT NULL,
  milestone_value integer NOT NULL,
  reached_at timestamptz DEFAULT now(),
  reward_unlocked text,
  CONSTRAINT unique_user_milestone UNIQUE (user_id, milestone_type, milestone_value)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_referral_rewards_user ON referral_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_claimed ON referral_rewards(user_id, claimed) WHERE NOT claimed;
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_completed ON user_achievements(user_id, completed);
CREATE INDEX IF NOT EXISTS idx_viral_metrics_user ON viral_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_viral_metrics_type ON viral_metrics(metric_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_share_prompts_user ON share_prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_milestones_user ON user_milestones(user_id);

-- Enable Row Level Security
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE viral_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_milestones ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referral_rewards
CREATE POLICY "Users can view own rewards"
  ON referral_rewards FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own rewards"
  ON referral_rewards FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_achievements
CREATE POLICY "Users can view own achievements"
  ON user_achievements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage achievements"
  ON user_achievements FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for viral_metrics
CREATE POLICY "Users can create own metrics"
  ON viral_metrics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for share_prompts
CREATE POLICY "Users can manage own share prompts"
  ON share_prompts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_milestones
CREATE POLICY "Users can view own milestones"
  ON user_milestones FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can create milestones"
  ON user_milestones FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to check and create achievements
CREATE OR REPLACE FUNCTION check_and_create_achievement(
  p_user_id uuid,
  p_achievement_type achievement_type,
  p_progress integer
)
RETURNS void AS $$
DECLARE
  v_achievement record;
  v_target integer;
  v_name text;
  v_description text;
  v_reward_value text;
BEGIN
  -- Define achievement details
  CASE p_achievement_type
    WHEN 'invite_3_friends' THEN
      v_target := 3;
      v_name := 'Social Starter';
      v_description := 'Invite 3 friends to unlock advanced taste matching';
      v_reward_value := 'advanced_matching';
    WHEN 'invite_5_friends' THEN
      v_target := 5;
      v_name := 'Community Builder';
      v_description := 'Invite 5 friends to get better recommendations';
      v_reward_value := 'enhanced_recommendations';
    WHEN 'invite_10_friends' THEN
      v_target := 10;
      v_name := 'Taste Ambassador';
      v_description := 'Invite 10 friends to unlock premium features';
      v_reward_value := 'premium_trial';
    WHEN 'ratings_milestone_10' THEN
      v_target := 10;
      v_name := 'Getting Started';
      v_description := 'Rate 10 restaurants';
      v_reward_value := 'taste_profile_boost';
    WHEN 'ratings_milestone_50' THEN
      v_target := 50;
      v_name := 'Taste Explorer';
      v_description := 'Rate 50 restaurants';
      v_reward_value := 'explorer_badge';
    ELSE
      RETURN;
  END CASE;

  -- Insert or update achievement
  INSERT INTO user_achievements (
    user_id,
    achievement_type,
    achievement_name,
    achievement_description,
    progress,
    target,
    completed,
    completed_at
  )
  VALUES (
    p_user_id,
    p_achievement_type,
    v_name,
    v_description,
    p_progress,
    v_target,
    p_progress >= v_target,
    CASE WHEN p_progress >= v_target THEN now() ELSE NULL END
  )
  ON CONFLICT (user_id, achievement_type)
  DO UPDATE SET
    progress = EXCLUDED.progress,
    completed = p_progress >= v_target,
    completed_at = CASE WHEN p_progress >= v_target AND user_achievements.completed_at IS NULL THEN now() ELSE user_achievements.completed_at END;

  -- Create reward if achievement just completed
  IF p_progress >= v_target THEN
    INSERT INTO referral_rewards (
      user_id,
      reward_type,
      reward_value,
      earned_at
    )
    VALUES (
      p_user_id,
      'unlock_feature',
      v_reward_value,
      now()
    )
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to track invitation acceptance and update achievements
CREATE OR REPLACE FUNCTION handle_invitation_accepted()
RETURNS TRIGGER AS $$
DECLARE
  v_friend_count integer;
BEGIN
  -- Update invitation status
  NEW.status := 'accepted';
  NEW.accepted_at := now();

  -- Get friend count for inviter
  SELECT get_friend_count(NEW.inviter_id) INTO v_friend_count;

  -- Check achievements
  PERFORM check_and_create_achievement(NEW.inviter_id, 'invite_3_friends', v_friend_count);
  PERFORM check_and_create_achievement(NEW.inviter_id, 'invite_5_friends', v_friend_count);
  PERFORM check_and_create_achievement(NEW.inviter_id, 'invite_10_friends', v_friend_count);

  -- Track viral metric
  INSERT INTO viral_metrics (user_id, metric_type, value)
  VALUES (NEW.inviter_id, 'invitation_accepted', 1);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for invitation acceptance
DROP TRIGGER IF EXISTS trigger_invitation_accepted ON invitations;
CREATE TRIGGER trigger_invitation_accepted
  BEFORE UPDATE ON invitations
  FOR EACH ROW
  WHEN (OLD.status = 'pending' AND NEW.status = 'accepted')
  EXECUTE FUNCTION handle_invitation_accepted();

-- Function to check rating milestones
CREATE OR REPLACE FUNCTION check_rating_milestones()
RETURNS TRIGGER AS $$
DECLARE
  v_rating_count integer;
BEGIN
  -- Get user's total rating count
  SELECT COUNT(*) INTO v_rating_count
  FROM user_ratings
  WHERE user_id = NEW.user_id;

  -- Check milestones
  IF v_rating_count = 10 THEN
    PERFORM check_and_create_achievement(NEW.user_id, 'ratings_milestone_10', 10);
  ELSIF v_rating_count = 50 THEN
    PERFORM check_and_create_achievement(NEW.user_id, 'ratings_milestone_50', 50);
  ELSIF v_rating_count = 100 THEN
    PERFORM check_and_create_achievement(NEW.user_id, 'ratings_milestone_100', 100);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for rating milestones
DROP TRIGGER IF EXISTS trigger_rating_milestones ON user_ratings;
CREATE TRIGGER trigger_rating_milestones
  AFTER INSERT ON user_ratings
  FOR EACH ROW
  EXECUTE FUNCTION check_rating_milestones();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_and_create_achievement(uuid, achievement_type, integer) TO authenticated;
