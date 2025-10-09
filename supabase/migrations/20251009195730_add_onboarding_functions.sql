/*
  # Add Onboarding Helper Functions

  1. Functions
    - `get_nearby_restaurants` - Returns restaurants near a given location, ordered by distance
      - Parameters: user_lat, user_lng, max_distance (meters), limit_count
      - Returns: Restaurant items with distance information
  
  2. Purpose
    - Support location-based restaurant fetching during onboarding
    - Use PostGIS for efficient spatial queries
    - Provide fallback if location is not available
*/

-- Function to get nearby restaurants ordered by distance
CREATE OR REPLACE FUNCTION get_nearby_restaurants(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  max_distance INTEGER DEFAULT 50000,
  limit_count INTEGER DEFAULT 15
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  category TEXT,
  attributes JSONB,
  location GEOGRAPHY,
  distance DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.name,
    i.category,
    i.attributes,
    i.location,
    ST_Distance(
      i.location::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) as distance
  FROM items i
  WHERE i.category = 'restaurant'
    AND i.location IS NOT NULL
    AND ST_DWithin(
      i.location::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      max_distance
    )
  ORDER BY distance ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
