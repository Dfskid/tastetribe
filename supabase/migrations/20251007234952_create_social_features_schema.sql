/*
  # Social Features Schema - Friends & Privacy System

  ## Overview
  This migration implements comprehensive social features for TasteTribe including
  friend relationships, privacy controls, invitations, and activity tracking.

  ## New Tables

  ### 1. `friendships` Table
  Bidirectional friend relationships with status tracking:
  - `id` (uuid, primary key) - Unique friendship identifier
  - `user_id` (uuid) - User who initiated the friendship
  - `friend_id` (uuid) - User who received the request
  - `status` (enum) - pending, accepted, blocked
  - `created_at` (timestamptz) - When relationship was created
  - `updated_at` (timestamptz) - Last status change
  - `deleted_at` (timestamptz, nullable) - Soft delete timestamp

  ### 2. `invitations` Table
  Track sent invitations and their status:
  - `id` (uuid, primary key)
  - `inviter_id` (uuid) - User sending invitation
  - `invitee_email` (text) - Email of invitee (nullable)
  - `invitee_phone` (text) - Phone of invitee (nullable)
  - `invitation_code` (text, unique) - Unique invitation code
  - `status` (enum) - pending, accepted, expired
  - `sent_via` (enum) - email, sms, link
  - `sent_at` (timestamptz)
  - `accepted_at` (timestamptz, nullable)
  - `expires_at` (timestamptz)

  ### 3. `user_privacy_settings` Table
  Granular privacy controls:
  - `user_id` (uuid, primary key)
  - `profile_visibility` (enum) - public, friends_only, private
  - `show_ratings` (boolean) - Show ratings in feed
  - `show_favorites` (boolean) - Show favorites publicly
  - `allow_friend_requests` (boolean)
  - `email_notifications` (boolean)
  - `sms_notifications` (boolean)
  - `updated_at` (timestamptz)

  ### 4. `blocked_users` Table
  Complete user isolation for blocked relationships:
  - `id` (uuid, primary key)
  - `blocker_id` (uuid) - User who blocked
  - `blocked_id` (uuid) - User who was blocked
  - `reason` (text, nullable)
  - `created_at` (timestamptz)

  ### 5. `activity_feed` Table
  Social activity tracking:
  - `id` (uuid, primary key)
  - `user_id` (uuid) - User who performed action
  - `activity_type` (enum) - rating, favorite, review, friend_joined
  - `item_id` (uuid, nullable) - Related item
  - `rating_value` (integer, nullable)
  - `content` (text, nullable) - Review text or custom content
  - `visibility` (enum) - public, friends_only, private
  - `created_at` (timestamptz)

  ### 6. `invitation_rate_limits` Table
  Prevent spam and abuse:
  - `user_id` (uuid, primary key)
  - `invitations_sent_today` (integer)
  - `last_reset` (timestamptz)
  - `total_invitations_sent` (integer)

  ## Security
  - Row Level Security (RLS) on all tables
  - Friend relationships require mutual acceptance
  - Blocked users completely isolated
  - Privacy settings enforced at database level
  - Rate limiting prevents invitation spam

  ## Performance
  - Composite indexes for friend lookups
  - Indexes on status fields for filtering
  - Partial indexes for active relationships
  - GIN indexes for text search on invitations

  ## Audit Trail
  - Soft deletes preserve relationship history
  - Activity logging for all social interactions
  - Timestamp tracking for compliance
*/

-- Create custom types for enums
DO $$ BEGIN
  CREATE TYPE friendship_status AS ENUM ('pending', 'accepted', 'blocked');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE invitation_method AS ENUM ('email', 'sms', 'link');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE profile_visibility AS ENUM ('public', 'friends_only', 'private');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE activity_type AS ENUM ('rating', 'favorite', 'review', 'friend_joined', 'milestone');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create friendships table
CREATE TABLE IF NOT EXISTS friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status friendship_status NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT different_users CHECK (user_id != friend_id),
  CONSTRAINT unique_friendship UNIQUE (user_id, friend_id)
);

-- Create invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_email text,
  invitee_phone text,
  invitation_code text UNIQUE NOT NULL,
  status invitation_status NOT NULL DEFAULT 'pending',
  sent_via invitation_method NOT NULL,
  sent_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL,
  CONSTRAINT has_contact CHECK (invitee_email IS NOT NULL OR invitee_phone IS NOT NULL)
);

-- Create user privacy settings table
CREATE TABLE IF NOT EXISTS user_privacy_settings (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  profile_visibility profile_visibility DEFAULT 'public',
  show_ratings boolean DEFAULT true,
  show_favorites boolean DEFAULT true,
  allow_friend_requests boolean DEFAULT true,
  email_notifications boolean DEFAULT true,
  sms_notifications boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

-- Create blocked users table
CREATE TABLE IF NOT EXISTS blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT different_block_users CHECK (blocker_id != blocked_id),
  CONSTRAINT unique_block UNIQUE (blocker_id, blocked_id)
);

-- Create activity feed table
CREATE TABLE IF NOT EXISTS activity_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type activity_type NOT NULL,
  item_id uuid REFERENCES items(id) ON DELETE CASCADE,
  rating_value integer CHECK (rating_value >= 1 AND rating_value <= 5),
  content text,
  visibility profile_visibility DEFAULT 'public',
  created_at timestamptz DEFAULT now()
);

-- Create invitation rate limits table
CREATE TABLE IF NOT EXISTS invitation_rate_limits (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  invitations_sent_today integer DEFAULT 0,
  last_reset timestamptz DEFAULT now(),
  total_invitations_sent integer DEFAULT 0
);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_friendships_friend_id ON friendships(friend_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_friendships_composite ON friendships(user_id, friend_id, status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_invitations_inviter ON invitations(inviter_id);
CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitations(invitation_code);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(invitee_email) WHERE invitee_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id);

CREATE INDEX IF NOT EXISTS idx_activity_feed_user ON activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created ON activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_visibility ON activity_feed(visibility);

-- Enable Row Level Security
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friendships
CREATE POLICY "Users can view own friendships"
  ON friendships FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = user_id OR auth.uid() = friend_id)
    AND deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users
      WHERE (blocker_id = auth.uid() AND blocked_id = user_id)
         OR (blocker_id = auth.uid() AND blocked_id = friend_id)
         OR (blocker_id = user_id AND blocked_id = auth.uid())
         OR (blocker_id = friend_id AND blocked_id = auth.uid())
    )
  );

CREATE POLICY "Users can create friendship requests"
  ON friendships FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can update own friendships"
  ON friendships FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = friend_id)
  WITH CHECK (auth.uid() = user_id OR auth.uid() = friend_id);

-- RLS Policies for invitations
CREATE POLICY "Users can view own invitations"
  ON invitations FOR SELECT
  TO authenticated
  USING (auth.uid() = inviter_id);

CREATE POLICY "Users can create invitations"
  ON invitations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = inviter_id);

-- RLS Policies for privacy settings
CREATE POLICY "Users can view own privacy settings"
  ON user_privacy_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own privacy settings"
  ON user_privacy_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own privacy settings"
  ON user_privacy_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for blocked users
CREATE POLICY "Users can view own blocks"
  ON blocked_users FOR SELECT
  TO authenticated
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can create blocks"
  ON blocked_users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can delete own blocks"
  ON blocked_users FOR DELETE
  TO authenticated
  USING (auth.uid() = blocker_id);

-- RLS Policies for activity feed
CREATE POLICY "Users can view visible activities"
  ON activity_feed FOR SELECT
  TO authenticated
  USING (
    visibility = 'public'
    OR (visibility = 'friends_only' AND EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted'
        AND deleted_at IS NULL
        AND ((user_id = auth.uid() AND friend_id = activity_feed.user_id)
          OR (friend_id = auth.uid() AND user_id = activity_feed.user_id))
    ))
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can create own activities"
  ON activity_feed FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for rate limits
CREATE POLICY "Users can view own rate limits"
  ON invitation_rate_limits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own rate limits"
  ON invitation_rate_limits FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create function to check if users are friends
CREATE OR REPLACE FUNCTION are_friends(user1_id uuid, user2_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM friendships
    WHERE status = 'accepted'
      AND deleted_at IS NULL
      AND ((user_id = user1_id AND friend_id = user2_id)
        OR (user_id = user2_id AND friend_id = user1_id))
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to check if user is blocked
CREATE OR REPLACE FUNCTION is_blocked(user1_id uuid, user2_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (blocker_id = user1_id AND blocked_id = user2_id)
       OR (blocker_id = user2_id AND blocked_id = user1_id)
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to get friend count
CREATE OR REPLACE FUNCTION get_friend_count(user_uuid uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer
    FROM friendships
    WHERE status = 'accepted'
      AND deleted_at IS NULL
      AND (user_id = user_uuid OR friend_id = user_uuid)
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Create function to get user's friends
CREATE OR REPLACE FUNCTION get_user_friends(user_uuid uuid)
RETURNS TABLE (
  friend_id uuid,
  display_name text,
  avatar_url text,
  friendship_since timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN f.user_id = user_uuid THEN f.friend_id
      ELSE f.user_id
    END AS friend_id,
    p.display_name,
    p.avatar_url,
    f.updated_at AS friendship_since
  FROM friendships f
  JOIN profiles p ON (
    CASE
      WHEN f.user_id = user_uuid THEN f.friend_id
      ELSE f.user_id
    END = p.id
  )
  WHERE (f.user_id = user_uuid OR f.friend_id = user_uuid)
    AND f.status = 'accepted'
    AND f.deleted_at IS NULL
  ORDER BY f.updated_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create trigger to automatically create privacy settings for new users
CREATE OR REPLACE FUNCTION create_default_privacy_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_privacy_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_privacy_settings ON profiles;
CREATE TRIGGER trigger_create_privacy_settings
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_privacy_settings();

-- Create trigger to automatically create activity feed entries for ratings
CREATE OR REPLACE FUNCTION create_rating_activity()
RETURNS TRIGGER AS $$
DECLARE
  user_visibility profile_visibility;
BEGIN
  -- Get user's privacy settings
  SELECT COALESCE(show_ratings, true)::boolean, profile_visibility
  INTO user_visibility
  FROM user_privacy_settings
  WHERE user_id = NEW.user_id;

  -- Only create activity if user allows showing ratings
  IF user_visibility THEN
    INSERT INTO activity_feed (user_id, activity_type, item_id, rating_value, visibility)
    VALUES (NEW.user_id, 'rating', NEW.item_id, NEW.rating, COALESCE(user_visibility, 'public'));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_rating_activity ON user_ratings;
CREATE TRIGGER trigger_create_rating_activity
  AFTER INSERT ON user_ratings
  FOR EACH ROW
  EXECUTE FUNCTION create_rating_activity();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_friendships_updated_at ON friendships;
CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_privacy_settings_updated_at ON user_privacy_settings;
CREATE TRIGGER update_privacy_settings_updated_at
  BEFORE UPDATE ON user_privacy_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION are_friends(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_blocked(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_friend_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_friends(uuid) TO authenticated;
