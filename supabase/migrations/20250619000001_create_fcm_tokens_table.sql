/*
  # FCM Tokens Table for Firebase Cloud Messaging

  1. New Tables
    - `fcm_tokens` table for storing Firebase Cloud Messaging tokens
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `fcm_token` (text, the actual FCM token)
      - `device_type` (text, web/android/ios)
      - `device_info` (jsonb, additional device information)
      - `browser_info` (jsonb, browser and platform information)
      - `is_active` (boolean, whether token is active)
      - `last_used_at` (timestamptz, when token was last used)
      - `expires_at` (timestamptz, when token expires)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for user access control
    - Add unique constraint on user_id and fcm_token combination

  3. Indexes
    - Add indexes for performance optimization

  4. Functions
    - Token cleanup and maintenance functions
    - Automatic expiration handling
*/

-- Drop table if exists (for clean migration)
DROP TABLE IF EXISTS fcm_tokens CASCADE;

-- Create fcm_tokens table with enhanced fields
CREATE TABLE fcm_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fcm_token text NOT NULL,
  device_type text NOT NULL DEFAULT 'web' CHECK (device_type IN ('web', 'android', 'ios')),
  device_info jsonb DEFAULT '{}'::jsonb,
  browser_info jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  last_used_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + INTERVAL '90 days'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Add constraints
  CONSTRAINT fcm_token_not_empty CHECK (length(fcm_token) > 0),
  CONSTRAINT valid_expiration CHECK (expires_at > created_at)
);

-- Create comprehensive indexes for performance
CREATE UNIQUE INDEX fcm_tokens_user_token_unique ON fcm_tokens(user_id, fcm_token);
CREATE INDEX fcm_tokens_user_id_idx ON fcm_tokens(user_id);
CREATE INDEX fcm_tokens_active_idx ON fcm_tokens(is_active) WHERE is_active = true;
CREATE INDEX fcm_tokens_device_type_idx ON fcm_tokens(device_type);
CREATE INDEX fcm_tokens_expires_at_idx ON fcm_tokens(expires_at);
CREATE INDEX fcm_tokens_last_used_idx ON fcm_tokens(last_used_at);
CREATE INDEX fcm_tokens_created_at_idx ON fcm_tokens(created_at);

-- Composite indexes for common queries
CREATE INDEX fcm_tokens_user_active_idx ON fcm_tokens(user_id, is_active) WHERE is_active = true;
CREATE INDEX fcm_tokens_active_not_expired_idx ON fcm_tokens(is_active, expires_at) WHERE is_active = true AND expires_at > now();

-- Enable Row Level Security
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own FCM tokens" ON fcm_tokens;
DROP POLICY IF EXISTS "Users can insert their own FCM tokens" ON fcm_tokens;
DROP POLICY IF EXISTS "Users can update their own FCM tokens" ON fcm_tokens;
DROP POLICY IF EXISTS "Users can delete their own FCM tokens" ON fcm_tokens;
DROP POLICY IF EXISTS "Admins can view all FCM tokens" ON fcm_tokens;
DROP POLICY IF EXISTS "Admins can manage all FCM tokens" ON fcm_tokens;

-- Create comprehensive RLS policies
CREATE POLICY "fcm_tokens_select_own"
  ON fcm_tokens
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "fcm_tokens_insert_own"
  ON fcm_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "fcm_tokens_update_own"
  ON fcm_tokens
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "fcm_tokens_delete_own"
  ON fcm_tokens
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin policies for managing all FCM tokens
CREATE POLICY "fcm_tokens_admin_select_all"
  ON fcm_tokens
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super-admin')
    )
  );

CREATE POLICY "fcm_tokens_admin_manage_all"
  ON fcm_tokens
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super-admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super-admin')
    )
  );

-- Service role policies for backend operations
CREATE POLICY "fcm_tokens_service_role_all"
  ON fcm_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Drop existing functions and triggers if they exist
DROP TRIGGER IF EXISTS update_fcm_tokens_updated_at_trigger ON fcm_tokens;
DROP TRIGGER IF EXISTS update_fcm_tokens_last_used_trigger ON fcm_tokens;
DROP FUNCTION IF EXISTS update_fcm_tokens_updated_at();
DROP FUNCTION IF EXISTS update_fcm_tokens_last_used();
DROP FUNCTION IF EXISTS cleanup_inactive_fcm_tokens();
DROP FUNCTION IF EXISTS cleanup_expired_fcm_tokens();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_fcm_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  -- Also update last_used_at if the token is being used
  IF NEW.is_active = true AND OLD.is_active = false THEN
    NEW.last_used_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to update last_used_at when token is accessed
CREATE OR REPLACE FUNCTION update_fcm_tokens_last_used()
RETURNS TRIGGER AS $$
BEGIN
  -- Update last_used_at when token is selected for active tokens
  IF NEW.is_active = true THEN
    NEW.last_used_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_fcm_tokens_updated_at_trigger
  BEFORE UPDATE ON fcm_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_fcm_tokens_updated_at();

-- Create function to cleanup expired/invalid FCM tokens
CREATE OR REPLACE FUNCTION cleanup_inactive_fcm_tokens()
RETURNS void AS $$
BEGIN
  -- Mark tokens as inactive if they haven't been updated in 30 days
  UPDATE fcm_tokens 
  SET is_active = false 
  WHERE updated_at < now() - INTERVAL '30 days' 
  AND is_active = true;
  
  -- Delete tokens that have been inactive for 90 days
  DELETE FROM fcm_tokens 
  WHERE is_active = false 
  AND updated_at < now() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT ALL ON fcm_tokens TO authenticated;
GRANT ALL ON fcm_tokens TO service_role;
