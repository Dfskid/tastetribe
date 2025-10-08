/*
  # Recommendation Caching and Analytics System

  ## Overview
  Adds caching infrastructure for personalized recommendations with TTL support
  and analytics tracking for recommendation performance optimization.

  ## New Tables

  ### 1. `recommendation_cache` Table
  Stores cached recommendation results for fast retrieval

  ### 2. `recommendation_analytics` Table
  Tracks recommendation quality and performance

  ### 3. `trending_items` Table
  Pre-computed trending items for performance

  ## Security
  - RLS enabled on all tables
  - Users can only access their own cache entries
  - Trending items are read-only for all authenticated users
*/

-- Create recommendation_cache table
CREATE TABLE IF NOT EXISTS recommendation_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'restaurant',
  location_lat double precision,
  location_lon double precision,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_accessed timestamptz DEFAULT now(),
  access_count integer DEFAULT 1
);

-- Create recommendation_analytics table
CREATE TABLE IF NOT EXISTS recommendation_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  recommendation_score double precision,
  position integer,
  was_clicked boolean DEFAULT false,
  was_rated boolean DEFAULT false,
  rating_value integer CHECK (rating_value IS NULL OR (rating_value >= 1 AND rating_value <= 5)),
  session_id text,
  created_at timestamptz DEFAULT now()
);

-- Create trending_items table
CREATE TABLE IF NOT EXISTS trending_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  category text NOT NULL,
  trending_score double precision DEFAULT 0,
  rating_count integer DEFAULT 0,
  avg_rating double precision DEFAULT 0,
  recent_activity_count integer DEFAULT 0,
  computed_at timestamptz DEFAULT now(),
  rank integer,
  CONSTRAINT unique_trending_item_category UNIQUE (item_id, category)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_recommendation_cache_user_category 
ON recommendation_cache(user_id, category);

CREATE INDEX IF NOT EXISTS idx_recommendation_cache_expires 
ON recommendation_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_recommendation_cache_location 
ON recommendation_cache(location_lat, location_lon);

CREATE INDEX IF NOT EXISTS idx_recommendation_analytics_user 
ON recommendation_analytics(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recommendation_analytics_item 
ON recommendation_analytics(item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trending_items_category_rank 
ON trending_items(category, rank);

CREATE INDEX IF NOT EXISTS idx_trending_items_score 
ON trending_items(category, trending_score DESC);

-- Enable Row Level Security
ALTER TABLE recommendation_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recommendation_cache
CREATE POLICY "Users can view own cache"
  ON recommendation_cache FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own cache"
  ON recommendation_cache FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cache"
  ON recommendation_cache FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own cache"
  ON recommendation_cache FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for recommendation_analytics
CREATE POLICY "Users can insert own analytics"
  ON recommendation_analytics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own analytics"
  ON recommendation_analytics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for trending_items
CREATE POLICY "All authenticated users can view trending"
  ON trending_items FOR SELECT
  TO authenticated
  USING (true);

-- Function to cleanup expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM recommendation_cache
  WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to invalidate user cache
CREATE OR REPLACE FUNCTION invalidate_user_cache(target_user_id uuid)
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM recommendation_cache
  WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to compute trending score
CREATE OR REPLACE FUNCTION compute_trending_score(
  item_uuid uuid,
  item_category text
) RETURNS double precision AS $$
DECLARE
  rating_cnt integer;
  avg_rat double precision;
  recent_cnt integer;
  recency_weight double precision;
  score double precision;
BEGIN
  SELECT COUNT(*), AVG(rating)
  INTO rating_cnt, avg_rat
  FROM user_ratings
  WHERE item_id = item_uuid;

  SELECT COUNT(*)
  INTO recent_cnt
  FROM user_ratings
  WHERE item_id = item_uuid
    AND created_at > now() - interval '7 days';

  recency_weight := 1.0 + (recent_cnt::double precision / NULLIF(rating_cnt, 0));

  score := (COALESCE(avg_rat, 0) / 5.0) * 
           ln(COALESCE(rating_cnt, 0) + 1) * 
           COALESCE(recency_weight, 1.0);

  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh trending items
CREATE OR REPLACE FUNCTION refresh_trending_items(
  target_category text DEFAULT 'restaurant'
) RETURNS integer AS $$
DECLARE
  inserted_count integer;
BEGIN
  DELETE FROM trending_items WHERE category = target_category;

  WITH trending_data AS (
    SELECT
      i.id,
      i.category,
      COUNT(ur.id) as rating_count,
      AVG(ur.rating) as avg_rating,
      COUNT(CASE WHEN ur.created_at > now() - interval '7 days' THEN 1 END) as recent_count
    FROM items i
    LEFT JOIN user_ratings ur ON i.id = ur.item_id
    WHERE i.category = target_category
    GROUP BY i.id, i.category
    HAVING COUNT(ur.id) >= 3
  ),
  scored_data AS (
    SELECT
      id,
      category,
      rating_count,
      avg_rating,
      recent_count,
      (avg_rating / 5.0) * ln(rating_count + 1) * (1.0 + recent_count::double precision / rating_count) as score
    FROM trending_data
  )
  INSERT INTO trending_items (
    item_id,
    category,
    trending_score,
    rating_count,
    avg_rating,
    recent_activity_count,
    computed_at,
    rank
  )
  SELECT
    id,
    category,
    score,
    rating_count,
    avg_rating,
    recent_count,
    now(),
    ROW_NUMBER() OVER (ORDER BY score DESC)
  FROM scored_data
  ORDER BY score DESC
  LIMIT 100;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION cleanup_expired_cache() TO authenticated;
GRANT EXECUTE ON FUNCTION invalidate_user_cache(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION compute_trending_score(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_trending_items(text) TO authenticated;
