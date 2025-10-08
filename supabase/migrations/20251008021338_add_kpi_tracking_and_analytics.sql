/*
  # KPI Tracking and Analytics System

  1. Purpose
    - Track viral coefficient (invites sent per user)
    - Monitor friend connection rate
    - Measure user retention (1-day, 7-day, 30-day)
    - Real-time KPI monitoring

  2. New Tables
    - user_events: Track all user actions for analytics
    - daily_kpis: Aggregated daily KPIs
    - retention_cohorts: Cohort analysis for retention tracking
    - funnel_metrics: Track conversion through user funnels

  3. Analytics Functions
    - Calculate viral coefficient
    - Compute retention rates
    - Track conversion funnels
*/

-- User events table for comprehensive tracking
CREATE TABLE IF NOT EXISTS user_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_category text NOT NULL,
  event_metadata jsonb,
  session_id text,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_type ON user_events(event_type);
CREATE INDEX IF NOT EXISTS idx_user_events_created ON user_events(created_at);
CREATE INDEX IF NOT EXISTS idx_user_events_category ON user_events(event_category);

-- Daily KPIs aggregation table
CREATE TABLE IF NOT EXISTS daily_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  total_users integer DEFAULT 0,
  new_users integer DEFAULT 0,
  active_users integer DEFAULT 0,
  total_invites_sent integer DEFAULT 0,
  invites_accepted integer DEFAULT 0,
  total_ratings integer DEFAULT 0,
  total_friendships integer DEFAULT 0,
  viral_coefficient numeric DEFAULT 0,
  friend_acceptance_rate numeric DEFAULT 0,
  avg_time_to_first_friend numeric DEFAULT 0,
  avg_ratings_per_user numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_kpis_date ON daily_kpis(date);

-- Retention cohorts table
CREATE TABLE IF NOT EXISTS retention_cohorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_date date NOT NULL,
  cohort_size integer NOT NULL,
  day_1_retained integer DEFAULT 0,
  day_7_retained integer DEFAULT 0,
  day_30_retained integer DEFAULT 0,
  retention_1_day numeric DEFAULT 0,
  retention_7_day numeric DEFAULT 0,
  retention_30_day numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(cohort_date)
);

CREATE INDEX IF NOT EXISTS idx_retention_cohorts_date ON retention_cohorts(cohort_date);

-- Funnel metrics table
CREATE TABLE IF NOT EXISTS funnel_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  funnel_name text NOT NULL,
  step_name text NOT NULL,
  step_order integer NOT NULL,
  users_entered integer DEFAULT 0,
  users_completed integer DEFAULT 0,
  conversion_rate numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(date, funnel_name, step_name)
);

CREATE INDEX IF NOT EXISTS idx_funnel_metrics_date ON funnel_metrics(date);
CREATE INDEX IF NOT EXISTS idx_funnel_metrics_funnel ON funnel_metrics(funnel_name);

-- Function to track user events
CREATE OR REPLACE FUNCTION track_event(
  p_user_id uuid,
  p_event_type text,
  p_event_category text,
  p_metadata jsonb DEFAULT NULL,
  p_session_id text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO user_events (
    user_id,
    event_type,
    event_category,
    event_metadata,
    session_id
  ) VALUES (
    p_user_id,
    p_event_type,
    p_event_category,
    p_metadata,
    p_session_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate viral coefficient for a specific date
CREATE OR REPLACE FUNCTION calculate_viral_coefficient(target_date date)
RETURNS numeric AS $$
DECLARE
  v_new_users integer;
  v_invites_from_new_users integer;
  v_viral_coef numeric;
BEGIN
  SELECT COUNT(DISTINCT id) INTO v_new_users
  FROM profiles
  WHERE DATE(created_at) = target_date;
  
  IF v_new_users = 0 THEN
    RETURN 0;
  END IF;
  
  SELECT COUNT(*) INTO v_invites_from_new_users
  FROM invitations
  WHERE DATE(sent_at) = target_date
  AND inviter_id IN (
    SELECT id FROM profiles WHERE DATE(created_at) = target_date
  );
  
  v_viral_coef := v_invites_from_new_users::numeric / v_new_users::numeric;
  
  RETURN v_viral_coef;
END;
$$ LANGUAGE plpgsql;

-- Calculate friend acceptance rate
CREATE OR REPLACE FUNCTION calculate_friend_acceptance_rate(target_date date)
RETURNS numeric AS $$
DECLARE
  v_invites_sent integer;
  v_invites_accepted integer;
  v_acceptance_rate numeric;
BEGIN
  SELECT COUNT(*) INTO v_invites_sent
  FROM invitations
  WHERE DATE(sent_at) = target_date;
  
  IF v_invites_sent = 0 THEN
    RETURN 0;
  END IF;
  
  SELECT COUNT(*) INTO v_invites_accepted
  FROM invitations
  WHERE DATE(accepted_at) = target_date;
  
  v_acceptance_rate := (v_invites_accepted::numeric / v_invites_sent::numeric) * 100;
  
  RETURN v_acceptance_rate;
END;
$$ LANGUAGE plpgsql;

-- Calculate retention rate for a cohort
CREATE OR REPLACE FUNCTION calculate_retention_rate(
  cohort_start_date date,
  retention_days integer
)
RETURNS numeric AS $$
DECLARE
  v_cohort_size integer;
  v_retained_users integer;
  v_retention_rate numeric;
  v_check_date date;
BEGIN
  v_check_date := cohort_start_date + (retention_days || ' days')::interval;
  
  SELECT COUNT(DISTINCT id) INTO v_cohort_size
  FROM profiles
  WHERE DATE(created_at) = cohort_start_date;
  
  IF v_cohort_size = 0 THEN
    RETURN 0;
  END IF;
  
  SELECT COUNT(DISTINCT user_id) INTO v_retained_users
  FROM user_events
  WHERE DATE(created_at) = v_check_date
  AND user_id IN (
    SELECT id FROM profiles WHERE DATE(created_at) = cohort_start_date
  );
  
  v_retention_rate := (v_retained_users::numeric / v_cohort_size::numeric) * 100;
  
  RETURN v_retention_rate;
END;
$$ LANGUAGE plpgsql;

-- Aggregate daily KPIs
CREATE OR REPLACE FUNCTION aggregate_daily_kpis(target_date date)
RETURNS void AS $$
DECLARE
  v_total_users integer;
  v_new_users integer;
  v_active_users integer;
  v_total_invites integer;
  v_accepted_invites integer;
  v_total_ratings integer;
  v_total_friendships integer;
  v_viral_coef numeric;
  v_acceptance_rate numeric;
  v_avg_ratings numeric;
BEGIN
  SELECT COUNT(*) INTO v_total_users
  FROM profiles
  WHERE DATE(created_at) <= target_date;
  
  SELECT COUNT(*) INTO v_new_users
  FROM profiles
  WHERE DATE(created_at) = target_date;
  
  SELECT COUNT(DISTINCT user_id) INTO v_active_users
  FROM user_events
  WHERE DATE(created_at) = target_date;
  
  SELECT COUNT(*) INTO v_total_invites
  FROM invitations
  WHERE DATE(sent_at) = target_date;
  
  SELECT COUNT(*) INTO v_accepted_invites
  FROM invitations
  WHERE DATE(accepted_at) = target_date;
  
  SELECT COUNT(*) INTO v_total_ratings
  FROM user_ratings
  WHERE DATE(created_at) = target_date;
  
  SELECT COUNT(*) INTO v_total_friendships
  FROM friendships
  WHERE DATE(created_at) = target_date;
  
  v_viral_coef := calculate_viral_coefficient(target_date);
  v_acceptance_rate := calculate_friend_acceptance_rate(target_date);
  
  SELECT AVG(rating_count) INTO v_avg_ratings
  FROM (
    SELECT user_id, COUNT(*) as rating_count
    FROM user_ratings
    WHERE DATE(created_at) <= target_date
    GROUP BY user_id
  ) subq;
  
  INSERT INTO daily_kpis (
    date,
    total_users,
    new_users,
    active_users,
    total_invites_sent,
    invites_accepted,
    total_ratings,
    total_friendships,
    viral_coefficient,
    friend_acceptance_rate,
    avg_ratings_per_user
  ) VALUES (
    target_date,
    v_total_users,
    v_new_users,
    v_active_users,
    v_total_invites,
    v_accepted_invites,
    v_total_ratings,
    v_total_friendships,
    v_viral_coef,
    v_acceptance_rate,
    COALESCE(v_avg_ratings, 0)
  )
  ON CONFLICT (date) DO UPDATE SET
    total_users = EXCLUDED.total_users,
    new_users = EXCLUDED.new_users,
    active_users = EXCLUDED.active_users,
    total_invites_sent = EXCLUDED.total_invites_sent,
    invites_accepted = EXCLUDED.invites_accepted,
    total_ratings = EXCLUDED.total_ratings,
    total_friendships = EXCLUDED.total_friendships,
    viral_coefficient = EXCLUDED.viral_coefficient,
    friend_acceptance_rate = EXCLUDED.friend_acceptance_rate,
    avg_ratings_per_user = EXCLUDED.avg_ratings_per_user,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Update retention cohorts
CREATE OR REPLACE FUNCTION update_retention_cohorts(target_date date)
RETURNS void AS $$
DECLARE
  v_cohort_size integer;
  v_day_1_retained integer;
  v_day_7_retained integer;
  v_day_30_retained integer;
BEGIN
  SELECT COUNT(DISTINCT id) INTO v_cohort_size
  FROM profiles
  WHERE DATE(created_at) = target_date;
  
  IF v_cohort_size = 0 THEN
    RETURN;
  END IF;
  
  SELECT COUNT(DISTINCT ue.user_id) INTO v_day_1_retained
  FROM user_events ue
  WHERE DATE(ue.created_at) = target_date + interval '1 day'
  AND ue.user_id IN (
    SELECT id FROM profiles WHERE DATE(created_at) = target_date
  );
  
  SELECT COUNT(DISTINCT ue.user_id) INTO v_day_7_retained
  FROM user_events ue
  WHERE DATE(ue.created_at) = target_date + interval '7 days'
  AND ue.user_id IN (
    SELECT id FROM profiles WHERE DATE(created_at) = target_date
  );
  
  SELECT COUNT(DISTINCT ue.user_id) INTO v_day_30_retained
  FROM user_events ue
  WHERE DATE(ue.created_at) = target_date + interval '30 days'
  AND ue.user_id IN (
    SELECT id FROM profiles WHERE DATE(created_at) = target_date
  );
  
  INSERT INTO retention_cohorts (
    cohort_date,
    cohort_size,
    day_1_retained,
    day_7_retained,
    day_30_retained,
    retention_1_day,
    retention_7_day,
    retention_30_day
  ) VALUES (
    target_date,
    v_cohort_size,
    v_day_1_retained,
    v_day_7_retained,
    v_day_30_retained,
    (v_day_1_retained::numeric / v_cohort_size::numeric) * 100,
    (v_day_7_retained::numeric / v_cohort_size::numeric) * 100,
    (v_day_30_retained::numeric / v_cohort_size::numeric) * 100
  )
  ON CONFLICT (cohort_date) DO UPDATE SET
    day_1_retained = EXCLUDED.day_1_retained,
    day_7_retained = EXCLUDED.day_7_retained,
    day_30_retained = EXCLUDED.day_30_retained,
    retention_1_day = EXCLUDED.retention_1_day,
    retention_7_day = EXCLUDED.retention_7_day,
    retention_30_day = EXCLUDED.retention_30_day,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Track funnel conversion
CREATE OR REPLACE FUNCTION track_funnel_step(
  p_date date,
  p_funnel_name text,
  p_step_name text,
  p_step_order integer,
  p_user_id uuid,
  p_completed boolean
) RETURNS void AS $$
BEGIN
  INSERT INTO funnel_metrics (
    date,
    funnel_name,
    step_name,
    step_order,
    users_entered,
    users_completed
  ) VALUES (
    p_date,
    p_funnel_name,
    p_step_name,
    p_step_order,
    1,
    CASE WHEN p_completed THEN 1 ELSE 0 END
  )
  ON CONFLICT (date, funnel_name, step_name) DO UPDATE SET
    users_entered = funnel_metrics.users_entered + 1,
    users_completed = funnel_metrics.users_completed + CASE WHEN p_completed THEN 1 ELSE 0 END,
    conversion_rate = ((funnel_metrics.users_completed + CASE WHEN p_completed THEN 1 ELSE 0 END)::numeric / (funnel_metrics.users_entered + 1)::numeric) * 100,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;