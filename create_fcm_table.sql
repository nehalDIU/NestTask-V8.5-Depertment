-- Run this SQL in your Supabase SQL Editor to create the FCM tokens table

-- Create fcm_tokens table with enhanced token management
CREATE TABLE IF NOT EXISTS fcm_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fcm_token text NOT NULL,
  device_type text NOT NULL DEFAULT 'web' CHECK (device_type IN ('web', 'android', 'ios')),
  device_info jsonb DEFAULT '{}'::jsonb,
  browser_info jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  last_used_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Add constraints for better token management
  CONSTRAINT fcm_token_not_empty CHECK (length(fcm_token) > 0),
  CONSTRAINT fcm_token_valid_length CHECK (length(fcm_token) > 50) -- FCM tokens are typically much longer
);

-- Create unique constraint to prevent duplicate tokens
CREATE UNIQUE INDEX IF NOT EXISTS fcm_tokens_user_token_unique
ON fcm_tokens(user_id, fcm_token);

-- Create partial unique index to ensure only one active token per user per device type
CREATE UNIQUE INDEX IF NOT EXISTS fcm_tokens_user_device_active_unique
ON fcm_tokens(user_id, device_type)
WHERE is_active = true;

-- Create index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS fcm_tokens_user_id_idx ON fcm_tokens(user_id);

-- Create index for active tokens
CREATE INDEX IF NOT EXISTS fcm_tokens_active_idx ON fcm_tokens(is_active) WHERE is_active = true;

-- Create index for device type
CREATE INDEX IF NOT EXISTS fcm_tokens_device_type_idx ON fcm_tokens(device_type);

-- Enable RLS
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies for fcm_tokens
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

-- Admin policies for managing all FCM tokens
CREATE POLICY "Admins can view all FCM tokens"
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

CREATE POLICY "Admins can manage all FCM tokens"
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
