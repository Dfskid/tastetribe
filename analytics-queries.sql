-- TasteTribe Analytics Queries
-- Use these queries to monitor KPIs and analyze user behavior

-- ============================================
-- DAILY KPI DASHBOARD
-- ============================================

-- Get yesterday's KPIs
SELECT
  date,
  total_users,
  new_users,
  active_users,
  total_invites_sent,
  invites_accepted,
  viral_coefficient,
  friend_acceptance_rate,
  avg_ratings_per_user
FROM daily_kpis
WHERE date = CURRENT_DATE - 1;

-- Get last 7 days trend
SELECT
  date,
  new_users,
  active_users,
  viral_coefficient,
  friend_acceptance_rate
FROM daily_kpis
WHERE date >= CURRENT_DATE - 7
ORDER BY date DESC;

-- Get last 30 days aggregated
SELECT
  COUNT(*) as days,
  SUM(new_users) as total_new_users,
  AVG(active_users) as avg_daily_active,
  AVG(viral_coefficient) as avg_viral_coef,
  AVG(friend_acceptance_rate) as avg_acceptance_rate
FROM daily_kpis
WHERE date >= CURRENT_DATE - 30;

-- ============================================
-- VIRAL GROWTH METRICS
-- ============================================

-- Top inviters (last 7 days)
SELECT
  p.display_name,
  p.id,
  COUNT(i.id) as invites_sent,
  COUNT(CASE WHEN i.status = 'accepted' THEN 1 END) as invites_accepted,
  ROUND(
    COUNT(CASE WHEN i.status = 'accepted' THEN 1 END)::numeric /
    NULLIF(COUNT(i.id), 0) * 100,
    2
  ) as acceptance_rate_pct
FROM profiles p
LEFT JOIN invitations i ON i.inviter_id = p.id
WHERE i.sent_at >= CURRENT_DATE - 7
GROUP BY p.id, p.display_name
ORDER BY invites_sent DESC
LIMIT 20;

-- Invitation funnel
SELECT
  COUNT(*) as total_invites,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted,
  COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired,
  ROUND(
    COUNT(CASE WHEN status = 'accepted' THEN 1 END)::numeric /
    COUNT(*)::numeric * 100,
    2
  ) as acceptance_rate_pct
FROM invitations
WHERE sent_at >= CURRENT_DATE - 30;

-- Average time to accept invitation
SELECT
  AVG(EXTRACT(EPOCH FROM (accepted_at - sent_at))/3600) as avg_hours_to_accept,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (accepted_at - sent_at))/3600) as median_hours
FROM invitations
WHERE status = 'accepted'
AND accepted_at >= CURRENT_DATE - 30;

-- ============================================
-- USER RETENTION ANALYSIS
-- ============================================

-- Get retention cohorts
SELECT
  cohort_date,
  cohort_size,
  day_1_retained,
  retention_1_day,
  day_7_retained,
  retention_7_day,
  day_30_retained,
  retention_30_day
FROM retention_cohorts
ORDER BY cohort_date DESC
LIMIT 30;

-- Calculate current week retention
SELECT
  cohort_date,
  cohort_size,
  ROUND(retention_1_day, 2) as d1_retention_pct,
  ROUND(retention_7_day, 2) as d7_retention_pct
FROM retention_cohorts
WHERE cohort_date >= CURRENT_DATE - 7
ORDER BY cohort_date DESC;

-- User activity distribution
SELECT
  DATE_TRUNC('day', created_at) as date,
  COUNT(DISTINCT user_id) as active_users
FROM user_events
WHERE created_at >= CURRENT_DATE - 30
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- ============================================
-- ENGAGEMENT METRICS
-- ============================================

-- Top rated restaurants
SELECT
  i.name,
  i.attributes->>'cuisine_type' as cuisine,
  COUNT(ur.id) as rating_count,
  ROUND(AVG(ur.rating), 2) as avg_rating,
  COUNT(DISTINCT ur.user_id) as unique_raters
FROM items i
JOIN user_ratings ur ON ur.item_id = i.id
WHERE ur.created_at >= CURRENT_DATE - 30
GROUP BY i.id, i.name, i.attributes->>'cuisine_type'
HAVING COUNT(ur.id) >= 5
ORDER BY avg_rating DESC, rating_count DESC
LIMIT 20;

-- Most active users
SELECT
  p.display_name,
  COUNT(DISTINCT ur.id) as ratings_count,
  COUNT(DISTINCT f.id) as friends_count,
  COUNT(DISTINCT i.id) as invites_sent
FROM profiles p
LEFT JOIN user_ratings ur ON ur.user_id = p.id AND ur.created_at >= CURRENT_DATE - 30
LEFT JOIN friendships f ON (f.user_id = p.id OR f.friend_id = p.id)
LEFT JOIN invitations i ON i.inviter_id = p.id AND i.sent_at >= CURRENT_DATE - 30
GROUP BY p.id, p.display_name
ORDER BY (COUNT(DISTINCT ur.id) + COUNT(DISTINCT i.id)) DESC
LIMIT 20;

-- Rating distribution
SELECT
  rating,
  COUNT(*) as count,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) as percentage
FROM user_ratings
WHERE created_at >= CURRENT_DATE - 30
GROUP BY rating
ORDER BY rating DESC;

-- ============================================
-- NETWORK ANALYSIS
-- ============================================

-- Friend network size distribution
SELECT
  friend_count,
  COUNT(*) as users_with_this_count,
  ROUND(COUNT(*)::numeric / SUM(COUNT(*)) OVER () * 100, 2) as percentage
FROM (
  SELECT
    user_id,
    COUNT(*) as friend_count
  FROM (
    SELECT user_id FROM friendships
    UNION ALL
    SELECT friend_id as user_id FROM friendships
  ) all_friendships
  GROUP BY user_id
) friend_counts
GROUP BY friend_count
ORDER BY friend_count;

-- Users with no friends (need attention)
SELECT
  p.id,
  p.display_name,
  p.created_at as signup_date,
  COUNT(ur.id) as ratings_count
FROM profiles p
LEFT JOIN friendships f ON (f.user_id = p.id OR f.friend_id = p.id)
LEFT JOIN user_ratings ur ON ur.user_id = p.id
WHERE f.id IS NULL
AND p.created_at >= CURRENT_DATE - 7
GROUP BY p.id, p.display_name, p.created_at
ORDER BY p.created_at DESC;

-- Network density (avg friends per user)
SELECT
  COUNT(DISTINCT user_id) + COUNT(DISTINCT friend_id) as total_users,
  COUNT(*) as total_friendships,
  ROUND(COUNT(*)::numeric / (COUNT(DISTINCT user_id) + COUNT(DISTINCT friend_id)), 2) as avg_friends_per_user
FROM friendships;

-- ============================================
-- SEARCH & DISCOVERY
-- ============================================

-- Popular search terms
SELECT
  event_metadata->>'search_term' as search_term,
  COUNT(*) as search_count,
  COUNT(DISTINCT user_id) as unique_users
FROM user_events
WHERE event_type = 'search'
AND created_at >= CURRENT_DATE - 7
AND event_metadata->>'search_term' IS NOT NULL
GROUP BY event_metadata->>'search_term'
ORDER BY search_count DESC
LIMIT 20;

-- Most viewed restaurants
SELECT
  i.name,
  i.attributes->>'cuisine_type' as cuisine,
  COUNT(ue.id) as view_count,
  COUNT(DISTINCT ue.user_id) as unique_viewers
FROM user_events ue
JOIN items i ON i.id = (ue.event_metadata->>'item_id')::uuid
WHERE ue.event_type = 'recommendation_viewed'
AND ue.created_at >= CURRENT_DATE - 7
GROUP BY i.id, i.name, i.attributes->>'cuisine_type'
ORDER BY view_count DESC
LIMIT 20;

-- Click-through rate on recommendations
SELECT
  COUNT(CASE WHEN event_type = 'recommendation_viewed' THEN 1 END) as views,
  COUNT(CASE WHEN event_type = 'recommendation_clicked' THEN 1 END) as clicks,
  ROUND(
    COUNT(CASE WHEN event_type = 'recommendation_clicked' THEN 1 END)::numeric /
    NULLIF(COUNT(CASE WHEN event_type = 'recommendation_viewed' THEN 1 END), 0) * 100,
    2
  ) as ctr_pct
FROM user_events
WHERE event_type IN ('recommendation_viewed', 'recommendation_clicked')
AND created_at >= CURRENT_DATE - 7;

-- ============================================
-- USER BEHAVIOR FUNNEL
-- ============================================

-- Onboarding funnel
SELECT
  step_name,
  step_order,
  users_entered,
  users_completed,
  ROUND(conversion_rate, 2) as conversion_pct
FROM funnel_metrics
WHERE funnel_name = 'onboarding'
AND date >= CURRENT_DATE - 7
ORDER BY step_order;

-- Time spent in app (session duration)
SELECT
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY session_duration_minutes) as p25,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY session_duration_minutes) as median,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY session_duration_minutes) as p75,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY session_duration_minutes) as p95,
  AVG(session_duration_minutes) as avg_duration
FROM (
  SELECT
    session_id,
    user_id,
    EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at)))/60 as session_duration_minutes
  FROM user_events
  WHERE created_at >= CURRENT_DATE - 7
  AND session_id IS NOT NULL
  GROUP BY session_id, user_id
  HAVING COUNT(*) > 1
) sessions;

-- ============================================
-- ERROR MONITORING
-- ============================================

-- Recent errors
SELECT
  event_metadata->>'error_message' as error,
  event_metadata->>'error_context' as context,
  COUNT(*) as occurrences,
  MAX(created_at) as last_occurred
FROM user_events
WHERE event_type = 'error'
AND created_at >= CURRENT_DATE - 1
GROUP BY event_metadata->>'error_message', event_metadata->>'error_context'
ORDER BY occurrences DESC;

-- Error rate over time
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(CASE WHEN event_type = 'error' THEN 1 END) as errors,
  COUNT(*) as total_events,
  ROUND(
    COUNT(CASE WHEN event_type = 'error' THEN 1 END)::numeric /
    NULLIF(COUNT(*), 0) * 100,
    4
  ) as error_rate_pct
FROM user_events
WHERE created_at >= CURRENT_DATE - 1
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- ============================================
-- ADMIN UTILITIES
-- ============================================

-- Manually aggregate KPIs for a specific date
SELECT aggregate_daily_kpis('2025-10-08'::date);

-- Update retention cohorts for a specific date
SELECT update_retention_cohorts('2025-10-08'::date);

-- Clean up old rate limit records
SELECT cleanup_old_rate_limits();

-- Check RLS policy enforcement
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Find users who need engagement boost
SELECT
  p.id,
  p.display_name,
  p.created_at,
  COALESCE(friend_count.cnt, 0) as friends,
  COALESCE(rating_count.cnt, 0) as ratings,
  COALESCE(invite_count.cnt, 0) as invites_sent
FROM profiles p
LEFT JOIN (
  SELECT user_id, COUNT(*) as cnt FROM friendships GROUP BY user_id
  UNION ALL
  SELECT friend_id as user_id, COUNT(*) as cnt FROM friendships GROUP BY friend_id
) friend_count ON friend_count.user_id = p.id
LEFT JOIN (
  SELECT user_id, COUNT(*) as cnt FROM user_ratings GROUP BY user_id
) rating_count ON rating_count.user_id = p.id
LEFT JOIN (
  SELECT inviter_id, COUNT(*) as cnt FROM invitations GROUP BY inviter_id
) invite_count ON invite_count.inviter_id = p.id
WHERE p.created_at >= CURRENT_DATE - 14
AND (
  COALESCE(friend_count.cnt, 0) < 2
  OR COALESCE(rating_count.cnt, 0) < 5
)
ORDER BY p.created_at DESC;

-- Database health check
SELECT
  'Total Users' as metric,
  COUNT(*)::text as value
FROM profiles
UNION ALL
SELECT
  'Active Today',
  COUNT(DISTINCT user_id)::text
FROM user_events
WHERE created_at >= CURRENT_DATE
UNION ALL
SELECT
  'Total Ratings',
  COUNT(*)::text
FROM user_ratings
UNION ALL
SELECT
  'Total Friendships',
  COUNT(*)::text
FROM friendships
UNION ALL
SELECT
  'Pending Invites',
  COUNT(*)::text
FROM invitations
WHERE status = 'pending';

-- ============================================
-- EXPORT FOR ANALYSIS
-- ============================================

-- Export user cohort data for external analysis
-- (Run this query and export to CSV)
SELECT
  p.id as user_id,
  p.created_at as signup_date,
  DATE_PART('day', CURRENT_DATE - p.created_at::date) as days_since_signup,
  COUNT(DISTINCT f.id) as friend_count,
  COUNT(DISTINCT ur.id) as rating_count,
  COUNT(DISTINCT i.id) as invites_sent,
  COUNT(DISTINCT CASE WHEN i.status = 'accepted' THEN i.id END) as invites_accepted,
  MAX(ue.created_at) as last_active
FROM profiles p
LEFT JOIN friendships f ON (f.user_id = p.id OR f.friend_id = p.id)
LEFT JOIN user_ratings ur ON ur.user_id = p.id
LEFT JOIN invitations i ON i.inviter_id = p.id
LEFT JOIN user_events ue ON ue.user_id = p.id
GROUP BY p.id, p.created_at
ORDER BY p.created_at DESC;