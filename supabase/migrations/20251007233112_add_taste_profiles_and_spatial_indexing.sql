/*
  # Enhanced TasteTribe Schema - Taste Profiles & Spatial Indexing

  ## Overview
  This migration enhances the TasteTribe database to support personalized recommendations
  through taste profiles and efficient location-based queries using PostGIS spatial indexing.

  ## New Features

  ### 1. Taste Profile System
  - Adds `taste_profile` JSONB column to profiles table
  - Stores user preferences as weighted vectors for recommendation algorithms
  - Includes GIN index for fast JSONB queries
  - Schema: {
      "cuisine_preferences": {"italian": 0.8, "mexican": 0.6},
      "price_preferences": {"$": 0.2, "$$": 0.5, "$$": 0.3},
      "attribute_weights": {"ambiance": 0.7, "service": 0.8},
      "rated_items": ["uuid1", "uuid2"],
      "last_updated": "timestamp"
    }

  ### 2. Spatial Indexing
  - Adds geography type for precise location storage
  - Implements PostGIS spatial indexing for fast proximity queries
  - Optimizes restaurant discovery within specified radius

  ### 3. Onboarding Tracking
  - Adds detailed onboarding status tracking
  - Stores onboarding step progress for resume capability
  - Tracks onboarding completion timestamp

  ### 4. Performance Indexes
  - GIN index on taste_profile for JSONB queries
  - GIST spatial index for location queries
  - Composite indexes for common query patterns

  ## Migration Safety
  - Uses IF NOT EXISTS for idempotent execution
  - Maintains backward compatibility with existing data
  - No data loss - only additive changes
  - Includes proper constraints and defaults

  ## Rollback Strategy
  To rollback, drop the added columns:
  - ALTER TABLE profiles DROP COLUMN IF EXISTS taste_profile;
  - ALTER TABLE profiles DROP COLUMN IF EXISTS location;
  - ALTER TABLE profiles DROP COLUMN IF EXISTS onboarding_step;
  - ALTER TABLE items DROP COLUMN IF EXISTS location;
*/

-- Enable PostGIS extension for spatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add taste profile column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'taste_profile'
  ) THEN
    ALTER TABLE profiles ADD COLUMN taste_profile JSONB DEFAULT '{
      "cuisine_preferences": {},
      "price_preferences": {},
      "attribute_weights": {},
      "rated_items": [],
      "last_updated": null
    }'::jsonb;
  END IF;
END $$;

-- Add location as geography type for profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'location'
  ) THEN
    ALTER TABLE profiles ADD COLUMN location geography(POINT, 4326);
  END IF;
END $$;

-- Add onboarding step tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'onboarding_step'
  ) THEN
    ALTER TABLE profiles ADD COLUMN onboarding_step INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add onboarding completed timestamp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'onboarding_completed_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN onboarding_completed_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add location to items table for spatial queries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'items' AND column_name = 'location'
  ) THEN
    ALTER TABLE items ADD COLUMN location geography(POINT, 4326);
  END IF;
END $$;

-- Create GIN index on taste_profile for fast JSONB queries
CREATE INDEX IF NOT EXISTS idx_profiles_taste_profile 
ON profiles USING GIN (taste_profile);

-- Create spatial index on profiles location
CREATE INDEX IF NOT EXISTS idx_profiles_location 
ON profiles USING GIST (location);

-- Create spatial index on items location
CREATE INDEX IF NOT EXISTS idx_items_location 
ON items USING GIST (location);

-- Create composite index for onboarding queries
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding 
ON profiles (onboarding_completed, onboarding_step);

-- Update existing items with location data from attributes
UPDATE items
SET location = ST_SetSRID(
  ST_MakePoint(
    CAST(attributes->>'longitude' AS FLOAT),
    CAST(attributes->>'latitude' AS FLOAT)
  ),
  4326
)::geography
WHERE category = 'restaurant'
  AND attributes->>'latitude' IS NOT NULL
  AND attributes->>'longitude' IS NOT NULL
  AND location IS NULL;

-- Create helper function to calculate distance between two points
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 FLOAT,
  lon1 FLOAT,
  lat2 FLOAT,
  lon2 FLOAT
) RETURNS FLOAT AS $$
BEGIN
  RETURN ST_Distance(
    ST_SetSRID(ST_MakePoint(lon1, lat1), 4326)::geography,
    ST_SetSRID(ST_MakePoint(lon2, lat2), 4326)::geography
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to find nearby restaurants
CREATE OR REPLACE FUNCTION find_nearby_restaurants(
  user_lat FLOAT,
  user_lon FLOAT,
  radius_meters FLOAT DEFAULT 10000,
  limit_count INTEGER DEFAULT 15
) RETURNS TABLE (
  id UUID,
  name TEXT,
  category TEXT,
  attributes JSONB,
  distance_meters FLOAT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.name,
    i.category,
    i.attributes,
    ST_Distance(
      i.location,
      ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography
    ) AS distance_meters,
    i.created_at
  FROM items i
  WHERE i.category = 'restaurant'
    AND i.location IS NOT NULL
    AND ST_DWithin(
      i.location,
      ST_SetSRID(ST_MakePoint(user_lon, user_lat), 4326)::geography,
      radius_meters
    )
  ORDER BY distance_meters ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to update taste profile after rating
CREATE OR REPLACE FUNCTION update_taste_profile()
RETURNS TRIGGER AS $$
DECLARE
  item_record RECORD;
  current_profile JSONB;
  cuisine TEXT;
  price TEXT;
BEGIN
  -- Get the item details
  SELECT * INTO item_record FROM items WHERE id = NEW.item_id;
  
  -- Get current profile or initialize
  SELECT taste_profile INTO current_profile 
  FROM profiles 
  WHERE id = NEW.user_id;
  
  IF current_profile IS NULL THEN
    current_profile := '{
      "cuisine_preferences": {},
      "price_preferences": {},
      "attribute_weights": {},
      "rated_items": [],
      "last_updated": null
    }'::jsonb;
  END IF;
  
  -- Extract cuisine and price from item attributes
  cuisine := item_record.attributes->>'cuisine_type';
  price := item_record.attributes->>'price_range';
  
  -- Update rated items list
  current_profile := jsonb_set(
    current_profile,
    '{rated_items}',
    (current_profile->'rated_items') || to_jsonb(NEW.item_id::text)
  );
  
  -- Update cuisine preferences (weighted by rating)
  IF cuisine IS NOT NULL THEN
    current_profile := jsonb_set(
      current_profile,
      ARRAY['cuisine_preferences', cuisine],
      to_jsonb(
        COALESCE(
          (current_profile->'cuisine_preferences'->>cuisine)::float,
          0
        ) + (NEW.rating::float / 5.0)
      )
    );
  END IF;
  
  -- Update price preferences
  IF price IS NOT NULL THEN
    current_profile := jsonb_set(
      current_profile,
      ARRAY['price_preferences', price],
      to_jsonb(
        COALESCE(
          (current_profile->'price_preferences'->>price)::float,
          0
        ) + (NEW.rating::float / 5.0)
      )
    );
  END IF;
  
  -- Update last_updated timestamp
  current_profile := jsonb_set(
    current_profile,
    '{last_updated}',
    to_jsonb(NOW())
  );
  
  -- Save updated profile
  UPDATE profiles
  SET taste_profile = current_profile
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update taste profile on rating
DROP TRIGGER IF EXISTS trigger_update_taste_profile ON user_ratings;
CREATE TRIGGER trigger_update_taste_profile
  AFTER INSERT OR UPDATE ON user_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_taste_profile();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION find_nearby_restaurants(FLOAT, FLOAT, FLOAT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_distance(FLOAT, FLOAT, FLOAT, FLOAT) TO authenticated;
