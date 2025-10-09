/*
  # Add Rating Details Column to User Ratings

  1. Changes
    - Add `rating_details` JSONB column to `user_ratings` table
    - This column will store enhanced rating data including:
      - Selected tags array
      - Individual aspect ratings (food quality, service, ambiance, value)
      - Additional contextual information
      - Timestamp of rating interaction
  
  2. Purpose
    - Enable rich data collection during onboarding
    - Support detailed rating analytics
    - Store user preferences and rating patterns
*/

-- Add rating_details column to user_ratings table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_ratings' 
    AND column_name = 'rating_details'
  ) THEN
    ALTER TABLE user_ratings 
    ADD COLUMN rating_details JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add index for JSON queries
CREATE INDEX IF NOT EXISTS idx_user_ratings_details 
ON user_ratings USING gin (rating_details);

-- Add comment for documentation
COMMENT ON COLUMN user_ratings.rating_details IS 'Enhanced rating data including tags, aspect ratings, and contextual information';
