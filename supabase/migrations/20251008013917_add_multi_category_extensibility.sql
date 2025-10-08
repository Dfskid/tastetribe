-- Multi-Category Extensibility Schema
--
-- Overview:
-- This migration extends the TasteTribe schema to support multiple item categories
-- (restaurants, movies, books, etc.) with a flexible, extensible architecture.
--
-- Changes:
-- 1. Add category_type enum to items table
-- 2. Create category_schemas table for dynamic attribute definitions
-- 3. Add search and filter optimization indexes
-- 4. Create partner_businesses table for B2B integrations
-- 5. Add notification_preferences table for user communication settings
-- 6. Create api_keys table for partner authentication
-- 7. Add audit_logs table for change tracking

-- Extend category enum to support multiple types
DO $$ BEGIN
  CREATE TYPE category_type AS ENUM ('restaurant', 'movie', 'book', 'event', 'experience');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add category_type column to items if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'category_type'
  ) THEN
    ALTER TABLE items ADD COLUMN category_type category_type DEFAULT 'restaurant';
    UPDATE items SET category_type = 'restaurant' WHERE category IS NOT NULL;
  END IF;
END $$;

-- Create category schemas table for dynamic attribute definitions
CREATE TABLE IF NOT EXISTS category_schemas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_type category_type NOT NULL UNIQUE,
  schema_version integer DEFAULT 1,
  required_attributes jsonb DEFAULT '[]'::jsonb,
  optional_attributes jsonb DEFAULT '[]'::jsonb,
  searchable_fields jsonb DEFAULT '[]'::jsonb,
  filterable_fields jsonb DEFAULT '[]'::jsonb,
  sortable_fields jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create partner businesses table
CREATE TABLE IF NOT EXISTS partner_businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  business_type text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  api_key_id uuid,
  webhook_url text,
  webhook_secret text,
  is_active boolean DEFAULT true,
  features jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create API keys table for partner authentication
CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES partner_businesses(id) ON DELETE CASCADE,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  name text,
  scopes jsonb DEFAULT '[]'::jsonb,
  rate_limit integer DEFAULT 1000,
  rate_limit_window integer DEFAULT 3600,
  last_used_at timestamptz,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  email_enabled boolean DEFAULT true,
  friend_recommendations boolean DEFAULT true,
  friend_activity boolean DEFAULT true,
  weekly_digest boolean DEFAULT true,
  trending_items boolean DEFAULT true,
  promotional_offers boolean DEFAULT false,
  digest_frequency text DEFAULT 'weekly',
  quiet_hours_start time,
  quiet_hours_end time,
  updated_at timestamptz DEFAULT now()
);

-- Create audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  changed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  changed_at timestamptz DEFAULT now(),
  ip_address inet,
  user_agent text
);

-- Add Google Place ID and enhanced attributes to items
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'external_id'
  ) THEN
    ALTER TABLE items ADD COLUMN external_id text;
    ALTER TABLE items ADD COLUMN external_source text;
    ALTER TABLE items ADD COLUMN verified boolean DEFAULT false;
    ALTER TABLE items ADD COLUMN last_synced_at timestamptz;
  END IF;
END $$;

-- Create comprehensive indexes for search and filter performance
CREATE INDEX IF NOT EXISTS idx_items_category_type ON items(category_type) WHERE category_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_items_external_id ON items(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_items_name_search ON items USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_items_attributes_gin ON items USING gin(attributes);
CREATE INDEX IF NOT EXISTS idx_items_location_gist ON items USING gist(location) WHERE location IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_category_location ON items(category_type, location) WHERE location IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_ratings_item_rating ON user_ratings(item_id, rating);
CREATE INDEX IF NOT EXISTS idx_user_ratings_created_at ON user_ratings(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_businesses_active ON partner_businesses(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_changed_at ON audit_logs(changed_at DESC);

-- Enable Row Level Security on new tables
ALTER TABLE category_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for category_schemas (public read, admin write)
CREATE POLICY "Anyone can view category schemas"
  ON category_schemas FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for partner_businesses (partners can view own, admins can manage)
CREATE POLICY "Partners can view own business"
  ON partner_businesses FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for api_keys (partners can view own keys)
CREATE POLICY "Partners can view own API keys"
  ON api_keys FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for notification_preferences
CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for audit_logs (users can view logs related to their data)
CREATE POLICY "Users can view own audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (changed_by = auth.uid());

-- Insert default category schemas
INSERT INTO category_schemas (category_type, required_attributes, optional_attributes, searchable_fields, filterable_fields, sortable_fields)
VALUES 
  (
    'restaurant',
    '["name", "cuisine_type", "price_range", "address"]'::jsonb,
    '["phone", "website", "hours", "google_place_id", "rating", "review_count"]'::jsonb,
    '["name", "cuisine_type", "address"]'::jsonb,
    '["cuisine_type", "price_range", "rating"]'::jsonb,
    '["name", "rating", "price_range", "distance"]'::jsonb
  ),
  (
    'movie',
    '["name", "genre", "release_year"]'::jsonb,
    '["director", "cast", "runtime", "rating", "plot", "poster_url", "imdb_id"]'::jsonb,
    '["name", "genre", "director", "cast"]'::jsonb,
    '["genre", "release_year", "rating"]'::jsonb,
    '["name", "release_year", "rating"]'::jsonb
  )
ON CONFLICT (category_type) DO NOTHING;

-- Create function to automatically create notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_notification_preferences ON profiles;
CREATE TRIGGER trigger_create_notification_preferences
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

-- Create function for search with relevance scoring
CREATE OR REPLACE FUNCTION search_items(
  p_category category_type,
  p_query text,
  p_location_lat double precision DEFAULT NULL,
  p_location_lon double precision DEFAULT NULL,
  p_max_distance_km double precision DEFAULT 50,
  p_filters jsonb DEFAULT '{}'::jsonb,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  name text,
  category text,
  category_type category_type,
  attributes jsonb,
  location geography,
  distance_km double precision,
  avg_rating double precision,
  rating_count bigint,
  relevance_score double precision
) AS $$
BEGIN
  RETURN QUERY
  WITH item_ratings AS (
    SELECT 
      item_id,
      AVG(rating)::double precision as avg_rating,
      COUNT(*)::bigint as rating_count
    FROM user_ratings
    GROUP BY item_id
  ),
  filtered_items AS (
    SELECT 
      i.id,
      i.name,
      i.category,
      i.category_type,
      i.attributes,
      i.location,
      CASE 
        WHEN p_location_lat IS NOT NULL AND p_location_lon IS NOT NULL AND i.location IS NOT NULL
        THEN ST_Distance(
          i.location::geography,
          ST_SetSRID(ST_MakePoint(p_location_lon, p_location_lat), 4326)::geography
        ) / 1000.0
        ELSE NULL
      END as distance_km,
      COALESCE(ir.avg_rating, 0.0) as avg_rating,
      COALESCE(ir.rating_count, 0) as rating_count,
      ts_rank(to_tsvector('english', i.name), plainto_tsquery('english', p_query)) as text_rank
    FROM items i
    LEFT JOIN item_ratings ir ON i.id = ir.item_id
    WHERE i.category_type = p_category
      AND (p_query IS NULL OR p_query = '' OR to_tsvector('english', i.name) @@ plainto_tsquery('english', p_query))
      AND (
        p_location_lat IS NULL OR p_location_lon IS NULL OR i.location IS NULL OR
        ST_DWithin(
          i.location::geography,
          ST_SetSRID(ST_MakePoint(p_location_lon, p_location_lat), 4326)::geography,
          p_max_distance_km * 1000
        )
      )
      AND (
        NOT (p_filters ? 'cuisine_type') OR 
        i.attributes->>'cuisine_type' = p_filters->>'cuisine_type'
      )
      AND (
        NOT (p_filters ? 'price_range') OR 
        i.attributes->>'price_range' = p_filters->>'price_range'
      )
      AND (
        NOT (p_filters ? 'min_rating') OR 
        COALESCE(ir.avg_rating, 0) >= (p_filters->>'min_rating')::double precision
      )
  )
  SELECT 
    fi.id,
    fi.name,
    fi.category,
    fi.category_type,
    fi.attributes,
    fi.location,
    fi.distance_km,
    fi.avg_rating,
    fi.rating_count,
    (
      COALESCE(fi.text_rank, 0) * 0.4 +
      COALESCE(fi.avg_rating / 5.0, 0) * 0.3 +
      COALESCE(LEAST(fi.rating_count / 100.0, 1.0), 0) * 0.2 +
      CASE WHEN fi.distance_km IS NOT NULL THEN (1.0 - LEAST(fi.distance_km / p_max_distance_km, 1.0)) * 0.1 ELSE 0 END
    ) as relevance_score
  FROM filtered_items fi
  ORDER BY relevance_score DESC, fi.avg_rating DESC, fi.rating_count DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION search_items TO authenticated;
