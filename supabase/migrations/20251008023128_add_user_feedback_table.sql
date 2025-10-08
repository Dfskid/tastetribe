/*
  # Add User Feedback Table

  1. Purpose
    - Collect alpha tester feedback
    - Track bugs, feature requests, and improvements
    - Enable product iteration based on user input

  2. New Table
    - user_feedback: Store feedback submissions

  3. Security
    - RLS enabled
    - Users can only view/insert their own feedback
*/

CREATE TABLE IF NOT EXISTS user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  feedback_type text NOT NULL CHECK (feedback_type IN ('bug', 'feature', 'improvement', 'other')),
  subject text NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'planned', 'in_progress', 'completed', 'wont_fix')),
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_type ON user_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created ON user_feedback(created_at);

ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feedback"
  ON user_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feedback"
  ON user_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);