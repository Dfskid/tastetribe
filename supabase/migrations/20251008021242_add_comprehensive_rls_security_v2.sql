/*
  # Comprehensive RLS and Security Implementation

  1. Purpose
    - Enable Row Level Security on all user-facing tables
    - Add comprehensive privacy controls
    - Implement security helper functions

  2. Security Enhancements
    - RLS policies for profiles, friendships, ratings
    - Privacy filtering based on user_privacy_settings
    - Security helper functions

  3. Tables Modified
    - Enable RLS on: profiles, friendships, invitations, user_ratings, activity_feed, user_favorites
*/

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view public profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own friendships" ON friendships;
DROP POLICY IF EXISTS "Users can create friendships" ON friendships;
DROP POLICY IF EXISTS "Users can delete own friendships" ON friendships;
DROP POLICY IF EXISTS "Users can view own invitations" ON invitations;
DROP POLICY IF EXISTS "Users can create invitations" ON invitations;
DROP POLICY IF EXISTS "Users can update invitations" ON invitations;
DROP POLICY IF EXISTS "Users can view own ratings" ON user_ratings;
DROP POLICY IF EXISTS "Users can view friends ratings" ON user_ratings;
DROP POLICY IF EXISTS "Users can create own ratings" ON user_ratings;
DROP POLICY IF EXISTS "Users can update own ratings" ON user_ratings;
DROP POLICY IF EXISTS "Users can delete own ratings" ON user_ratings;
DROP POLICY IF EXISTS "Users can view own activity" ON activity_feed;
DROP POLICY IF EXISTS "Users can view friends activity" ON activity_feed;
DROP POLICY IF EXISTS "Users can view own favorites" ON user_favorites;
DROP POLICY IF EXISTS "Users can insert own favorites" ON user_favorites;
DROP POLICY IF EXISTS "Users can delete own favorites" ON user_favorites;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can view public profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id != auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM user_privacy_settings ups
      WHERE ups.user_id = profiles.id
      AND ups.profile_visibility = 'private'
    )
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users
      WHERE (blocker_id = auth.uid() AND blocked_id = profiles.id)
         OR (blocker_id = profiles.id AND blocked_id = auth.uid())
    )
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Friendships policies
CREATE POLICY "Users can view own friendships"
  ON friendships FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = user_id OR auth.uid() = friend_id)
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users
      WHERE (blocker_id = auth.uid() AND (blocked_id = user_id OR blocked_id = friend_id))
         OR (blocked_id = auth.uid() AND (blocker_id = user_id OR blocker_id = friend_id))
    )
  );

CREATE POLICY "Users can create friendships"
  ON friendships FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND user_id != friend_id
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users
      WHERE (blocker_id = user_id AND blocked_id = friend_id)
         OR (blocker_id = friend_id AND blocked_id = user_id)
    )
  );

CREATE POLICY "Users can delete own friendships"
  ON friendships FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Invitations policies
CREATE POLICY "Users can view own invitations"
  ON invitations FOR SELECT
  TO authenticated
  USING (auth.uid() = inviter_id);

CREATE POLICY "Users can create invitations"
  ON invitations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Users can update invitations"
  ON invitations FOR UPDATE
  TO authenticated
  USING (auth.uid() = inviter_id)
  WITH CHECK (auth.uid() = inviter_id);

-- User ratings policies
CREATE POLICY "Users can view own ratings"
  ON user_ratings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view friends ratings"
  ON user_ratings FOR SELECT
  TO authenticated
  USING (
    user_id != auth.uid()
    AND EXISTS (
      SELECT 1 FROM friendships
      WHERE (friendships.user_id = auth.uid() AND friendships.friend_id = user_ratings.user_id)
         OR (friendships.friend_id = auth.uid() AND friendships.user_id = user_ratings.user_id)
    )
    AND (
      NOT EXISTS (
        SELECT 1 FROM user_privacy_settings ups
        WHERE ups.user_id = user_ratings.user_id
        AND ups.show_ratings = false
      )
      OR NOT EXISTS (
        SELECT 1 FROM user_privacy_settings ups WHERE ups.user_id = user_ratings.user_id
      )
    )
  );

CREATE POLICY "Users can create own ratings"
  ON user_ratings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ratings"
  ON user_ratings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ratings"
  ON user_ratings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Activity feed policies
CREATE POLICY "Users can view own activity"
  ON activity_feed FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view friends activity"
  ON activity_feed FOR SELECT
  TO authenticated
  USING (
    user_id != auth.uid()
    AND EXISTS (
      SELECT 1 FROM friendships
      WHERE (friendships.user_id = auth.uid() AND friendships.friend_id = activity_feed.user_id)
         OR (friendships.friend_id = auth.uid() AND friendships.user_id = activity_feed.user_id)
    )
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users
      WHERE (blocker_id = auth.uid() AND blocked_id = activity_feed.user_id)
         OR (blocker_id = activity_feed.user_id AND blocked_id = auth.uid())
    )
  );

-- User favorites policies
CREATE POLICY "Users can view own favorites"
  ON user_favorites FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites"
  ON user_favorites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON user_favorites FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Security helper functions
CREATE OR REPLACE FUNCTION can_view_profile(target_user_id uuid)
RETURNS boolean AS $$
BEGIN
  IF auth.uid() = target_user_id THEN
    RETURN true;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (blocker_id = auth.uid() AND blocked_id = target_user_id)
       OR (blocker_id = target_user_id AND blocked_id = auth.uid())
  ) THEN
    RETURN false;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM user_privacy_settings
    WHERE user_id = target_user_id
    AND profile_visibility = 'private'
  ) THEN
    RETURN false;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM user_privacy_settings
    WHERE user_id = target_user_id
    AND profile_visibility = 'friends'
  ) THEN
    RETURN EXISTS (
      SELECT 1 FROM friendships
      WHERE (user_id = auth.uid() AND friend_id = target_user_id)
         OR (friend_id = auth.uid() AND user_id = target_user_id)
    );
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get recommendations with privacy/blocking filters
CREATE OR REPLACE FUNCTION get_safe_recommendations(
  p_user_id uuid,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  item_id uuid,
  item_name text,
  score numeric,
  friend_count integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id as item_id,
    i.name as item_name,
    AVG(ur.rating) as score,
    COUNT(DISTINCT ur.user_id)::integer as friend_count
  FROM items i
  JOIN user_ratings ur ON ur.item_id = i.id
  JOIN friendships f ON (
    (f.user_id = p_user_id AND f.friend_id = ur.user_id)
    OR (f.friend_id = p_user_id AND f.user_id = ur.user_id)
  )
  WHERE NOT EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (blocker_id = p_user_id AND blocked_id = ur.user_id)
       OR (blocker_id = ur.user_id AND blocked_id = p_user_id)
  )
  AND NOT EXISTS (
    SELECT 1 FROM user_ratings
    WHERE user_id = p_user_id AND item_id = i.id
  )
  AND (
    NOT EXISTS (
      SELECT 1 FROM user_privacy_settings ups
      WHERE ups.user_id = ur.user_id
      AND ups.show_ratings = false
    )
    OR NOT EXISTS (
      SELECT 1 FROM user_privacy_settings ups WHERE ups.user_id = ur.user_id
    )
  )
  GROUP BY i.id, i.name
  HAVING COUNT(DISTINCT ur.user_id) >= 2
  ORDER BY AVG(ur.rating) DESC, COUNT(DISTINCT ur.user_id) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sanitize text input
CREATE OR REPLACE FUNCTION sanitize_text(input_text text)
RETURNS text AS $$
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  input_text := regexp_replace(input_text, '<script[^>]*>.*?</script>', '', 'gi');
  input_text := regexp_replace(input_text, '<iframe[^>]*>.*?</iframe>', '', 'gi');
  input_text := regexp_replace(input_text, 'javascript:', '', 'gi');
  input_text := regexp_replace(input_text, 'on\w+\s*=', '', 'gi');
  
  input_text := trim(both from input_text);
  input_text := left(input_text, 5000);
  
  RETURN input_text;
END;
$$ LANGUAGE plpgsql IMMUTABLE;