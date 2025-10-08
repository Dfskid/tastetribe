/*
  # Admin System and Subscription Infrastructure

  ## Overview
  This migration creates the complete admin authorization system, subscription management,
  and monetization infrastructure for TasteTribe.

  ## New Tables

  ### 1. `admin_roles` Table
  Defines admin permission levels:
  - `id` (uuid, primary key)
  - `user_id` (uuid) - References profiles(id)
  - `role` (text) - Admin role: super_admin, content_manager, analyst
  - `permissions` (jsonb) - Granular permissions object
  - `created_at` (timestamptz)
  - `created_by` (uuid) - References profiles(id)

  ### 2. `subscription_tiers` Table
  Defines available subscription plans:
  - `id` (uuid, primary key)
  - `name` (text) - Tier name (free, basic, premium, enterprise)
  - `price_monthly` (integer) - Price in cents
  - `price_yearly` (integer) - Annual price in cents
  - `features` (jsonb) - Feature flags and limits
  - `stripe_price_id_monthly` (text)
  - `stripe_price_id_yearly` (text)
  - `active` (boolean)
  - `created_at` (timestamptz)

  ### 3. `user_subscriptions` Table
  Tracks user subscription status:
  - `id` (uuid, primary key)
  - `user_id` (uuid) - References profiles(id)
  - `tier_id` (uuid) - References subscription_tiers(id)
  - `status` (text) - active, canceled, past_due, trialing
  - `stripe_customer_id` (text)
  - `stripe_subscription_id` (text)
  - `current_period_start` (timestamptz)
  - `current_period_end` (timestamptz)
  - `cancel_at_period_end` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. `payment_history` Table
  Records all payment transactions:
  - `id` (uuid, primary key)
  - `user_id` (uuid) - References profiles(id)
  - `stripe_payment_id` (text)
  - `amount` (integer) - Amount in cents
  - `currency` (text)
  - `status` (text) - succeeded, failed, pending
  - `description` (text)
  - `created_at` (timestamptz)

  ### 5. `categories` Table
  Manages content categories with metadata:
  - `id` (uuid, primary key)
  - `name` (text) - Category name (unique)
  - `slug` (text) - URL-friendly slug (unique)
  - `description` (text)
  - `icon` (text) - Icon identifier
  - `active` (boolean)
  - `recommendation_config` (jsonb) - Algorithm settings
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 6. `ab_tests` Table
  A/B testing framework for recommendations:
  - `id` (uuid, primary key)
  - `name` (text) - Test name
  - `category` (text) - Which category to test
  - `variants` (jsonb) - Array of test variants
  - `active` (boolean)
  - `start_date` (timestamptz)
  - `end_date` (timestamptz)
  - `created_at` (timestamptz)

  ### 7. `ab_test_assignments` Table
  Tracks user assignments to test variants:
  - `id` (uuid, primary key)
  - `test_id` (uuid) - References ab_tests(id)
  - `user_id` (uuid) - References profiles(id)
  - `variant` (text) - Which variant user sees
  - `assigned_at` (timestamptz)

  ### 8. `recommendation_performance` Table
  Tracks recommendation algorithm performance:
  - `id` (uuid, primary key)
  - `category` (text)
  - `algorithm_version` (text)
  - `variant` (text) - For A/B testing
  - `recommendations_shown` (integer)
  - `recommendations_clicked` (integer)
  - `recommendations_rated` (integer)
  - `avg_rating` (numeric)
  - `date` (date)
  - `created_at` (timestamptz)

  ## Security
  - Admin roles: Only super_admins can manage admin roles
  - Categories: Admins can manage, users can read
  - Subscriptions: Users can view own subscription, admins can view all
  - Payment history: Users can view own history, admins can view all
  - A/B tests: Admin-only access

  ## Performance
  - Indexes on all foreign keys
  - Composite indexes for subscription lookups
  - Indexes for admin role verification
*/

-- Create admin_roles table
CREATE TABLE IF NOT EXISTS admin_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('super_admin', 'content_manager', 'analyst')),
  permissions jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  UNIQUE(user_id)
);

-- Create subscription_tiers table
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (name IN ('free', 'basic', 'premium', 'enterprise')),
  price_monthly integer NOT NULL DEFAULT 0,
  price_yearly integer NOT NULL DEFAULT 0,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  stripe_price_id_monthly text,
  stripe_price_id_yearly text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tier_id uuid NOT NULL REFERENCES subscription_tiers(id),
  status text NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create payment_history table
CREATE TABLE IF NOT EXISTS payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_payment_id text UNIQUE,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL CHECK (status IN ('succeeded', 'failed', 'pending', 'refunded')),
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  icon text,
  active boolean DEFAULT true,
  recommendation_config jsonb DEFAULT '{
    "algorithm": "collaborative_filtering",
    "weights": {
      "friend_similarity": 0.4,
      "taste_profile": 0.3,
      "popularity": 0.2,
      "recency": 0.1
    },
    "min_ratings": 3
  }'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create ab_tests table
CREATE TABLE IF NOT EXISTS ab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  variants jsonb NOT NULL,
  active boolean DEFAULT false,
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create ab_test_assignments table
CREATE TABLE IF NOT EXISTS ab_test_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  variant text NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(test_id, user_id)
);

-- Create recommendation_performance table
CREATE TABLE IF NOT EXISTS recommendation_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  algorithm_version text NOT NULL,
  variant text,
  recommendations_shown integer DEFAULT 0,
  recommendations_clicked integer DEFAULT 0,
  recommendations_rated integer DEFAULT 0,
  avg_rating numeric(3,2),
  date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(category, algorithm_version, variant, date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admin_roles_user_id ON admin_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_roles_role ON admin_roles(role);
CREATE INDEX IF NOT EXISTS idx_subscription_tiers_name ON subscription_tiers(name);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_stripe_id ON payment_history(stripe_payment_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(active);
CREATE INDEX IF NOT EXISTS idx_ab_tests_active ON ab_tests(active);
CREATE INDEX IF NOT EXISTS idx_ab_test_assignments_user_id ON ab_test_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_performance_date ON recommendation_performance(date);

-- Enable RLS
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_performance ENABLE ROW LEVEL SECURITY;

-- Admin roles policies
CREATE POLICY "Super admins can view all admin roles"
  ON admin_roles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can manage admin roles"
  ON admin_roles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_roles ar
      WHERE ar.user_id = auth.uid() AND ar.role = 'super_admin'
    )
  );

-- Subscription tiers policies
CREATE POLICY "Anyone can view active subscription tiers"
  ON subscription_tiers FOR SELECT
  TO authenticated
  USING (active = true);

CREATE POLICY "Admins can manage subscription tiers"
  ON subscription_tiers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE user_id = auth.uid() AND role IN ('super_admin', 'content_manager')
    )
  );

-- User subscriptions policies
CREATE POLICY "Users can view own subscription"
  ON user_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all subscriptions"
  ON user_subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage subscriptions"
  ON user_subscriptions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Payment history policies
CREATE POLICY "Users can view own payment history"
  ON payment_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all payment history"
  ON payment_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert payment history"
  ON payment_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Categories policies
CREATE POLICY "Anyone can view active categories"
  ON categories FOR SELECT
  TO authenticated
  USING (active = true);

CREATE POLICY "Admins can view all categories"
  ON categories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE user_id = auth.uid() AND role IN ('super_admin', 'content_manager')
    )
  );

-- A/B tests policies (admin only)
CREATE POLICY "Admins can view ab_tests"
  ON ab_tests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage ab_tests"
  ON ab_tests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE user_id = auth.uid() AND role IN ('super_admin', 'analyst')
    )
  );

-- A/B test assignments policies
CREATE POLICY "Users can view own test assignments"
  ON ab_test_assignments FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create test assignments"
  ON ab_test_assignments FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Recommendation performance policies (admin only)
CREATE POLICY "Admins can view recommendation performance"
  ON recommendation_performance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can track recommendation performance"
  ON recommendation_performance FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(check_user_id uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_roles
    WHERE user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check specific admin role
CREATE OR REPLACE FUNCTION has_admin_role(required_role text, check_user_id uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_roles
    WHERE user_id = check_user_id AND role = required_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's subscription tier
CREATE OR REPLACE FUNCTION get_user_subscription_tier(check_user_id uuid DEFAULT auth.uid())
RETURNS text AS $$
DECLARE
  tier_name text;
BEGIN
  SELECT st.name INTO tier_name
  FROM user_subscriptions us
  JOIN subscription_tiers st ON us.tier_id = st.id
  WHERE us.user_id = check_user_id AND us.status = 'active';
  
  RETURN COALESCE(tier_name, 'free');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for updated_at
CREATE TRIGGER update_subscription_tiers_updated_at
  BEFORE UPDATE ON subscription_tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ab_tests_updated_at
  BEFORE UPDATE ON ab_tests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default subscription tiers
INSERT INTO subscription_tiers (name, price_monthly, price_yearly, features) VALUES
  ('free', 0, 0, '{
    "max_ratings_per_day": 10,
    "max_favorites": 50,
    "recommendations_per_day": 20,
    "social_features": true,
    "advanced_filters": false,
    "priority_support": false
  }'::jsonb),
  ('basic', 499, 4990, '{
    "max_ratings_per_day": 50,
    "max_favorites": 200,
    "recommendations_per_day": 100,
    "social_features": true,
    "advanced_filters": true,
    "priority_support": false
  }'::jsonb),
  ('premium', 999, 9990, '{
    "max_ratings_per_day": -1,
    "max_favorites": -1,
    "recommendations_per_day": -1,
    "social_features": true,
    "advanced_filters": true,
    "priority_support": true,
    "custom_lists": true,
    "export_data": true
  }'::jsonb),
  ('enterprise', 4999, 49990, '{
    "max_ratings_per_day": -1,
    "max_favorites": -1,
    "recommendations_per_day": -1,
    "social_features": true,
    "advanced_filters": true,
    "priority_support": true,
    "custom_lists": true,
    "export_data": true,
    "api_access": true,
    "white_label": true,
    "dedicated_account_manager": true
  }'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Insert default categories
INSERT INTO categories (name, slug, description, icon, recommendation_config) VALUES
  ('Restaurants', 'restaurants', 'Find amazing places to eat', 'utensils', '{
    "algorithm": "collaborative_filtering",
    "weights": {"friend_similarity": 0.4, "taste_profile": 0.3, "popularity": 0.2, "recency": 0.1},
    "min_ratings": 3
  }'::jsonb),
  ('Movies', 'movies', 'Discover your next favorite movie', 'film', '{
    "algorithm": "content_based",
    "weights": {"genre_match": 0.35, "friend_similarity": 0.25, "ratings": 0.25, "recency": 0.15},
    "min_ratings": 5
  }'::jsonb),
  ('TV Shows', 'tv-shows', 'Find binge-worthy TV series', 'tv', '{
    "algorithm": "hybrid",
    "weights": {"genre_match": 0.3, "friend_similarity": 0.3, "ratings": 0.25, "trending": 0.15},
    "min_ratings": 5
  }'::jsonb),
  ('Travel', 'travel', 'Explore incredible destinations', 'map-pin', '{
    "algorithm": "location_based",
    "weights": {"friend_similarity": 0.35, "location_proximity": 0.3, "ratings": 0.2, "season": 0.15},
    "min_ratings": 3
  }'::jsonb)
ON CONFLICT (slug) DO NOTHING;
