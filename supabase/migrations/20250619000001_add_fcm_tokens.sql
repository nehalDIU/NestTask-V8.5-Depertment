/*
  # Add FCM Token Management

  1. New Tables
    - `fcm_tokens` table for storing Firebase Cloud Messaging tokens
    - Includes device information and platform details
    
  2. Security
    - Enable RLS
    - Add policies for user token management
    
  3. Indexes
    - Add indexes for performance optimization
*/

-- Create fcm_tokens table
CREATE TABLE IF NOT EXISTS fcm_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fcm_token text NOT NULL,
  device_type text NOT NULL DEFAULT 'web', -- 'web', 'android', 'ios'
  platform text, -- Browser name, OS, etc.
  device_id text, -- Unique device identifier
  is_active boolean DEFAULT true,
  last_used_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure unique token per user per device
  UNIQUE(user_id, fcm_token)
);

-- Enable RLS
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies for FCM tokens
CREATE POLICY "Users can view their own FCM tokens"
  ON fcm_tokens
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own FCM tokens"
  ON fcm_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own FCM tokens"
  ON fcm_tokens
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own FCM tokens"
  ON fcm_tokens
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_active ON fcm_tokens(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_device_type ON fcm_tokens(device_type);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_last_used ON fcm_tokens(last_used_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_fcm_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_fcm_tokens_updated_at_trigger
  BEFORE UPDATE ON fcm_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_fcm_tokens_updated_at();

-- Create function to cleanup expired FCM tokens
CREATE OR REPLACE FUNCTION cleanup_expired_fcm_tokens()
RETURNS void AS $$
BEGIN
  -- Mark tokens as inactive if not used for 30 days
  UPDATE fcm_tokens 
  SET is_active = false 
  WHERE last_used_at < now() - interval '30 days' 
    AND is_active = true;
    
  -- Delete tokens that have been inactive for 90 days
  DELETE FROM fcm_tokens 
  WHERE is_active = false 
    AND updated_at < now() - interval '90 days';
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON fcm_tokens TO authenticated;
