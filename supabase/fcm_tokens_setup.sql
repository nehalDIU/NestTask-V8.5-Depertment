-- Create fcm_tokens table to store Firebase Cloud Messaging tokens
CREATE TABLE IF NOT EXISTS public.fcm_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL,
  device_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_used TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Add a unique constraint to prevent duplicate tokens per user
  CONSTRAINT unique_user_token UNIQUE (user_id, fcm_token)
);

-- Add RLS (Row Level Security) policies
ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own tokens
CREATE POLICY "Users can view their own tokens" 
  ON public.fcm_tokens
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own tokens
CREATE POLICY "Users can insert their own tokens" 
  ON public.fcm_tokens
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own tokens
CREATE POLICY "Users can update their own tokens" 
  ON public.fcm_tokens
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own tokens
CREATE POLICY "Users can delete their own tokens" 
  ON public.fcm_tokens
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Policy: Service role can access all tokens (for push notification sending)
CREATE POLICY "Service role can access all tokens" 
  ON public.fcm_tokens
  USING (auth.role() = 'service_role');

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON public.fcm_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_token ON public.fcm_tokens (fcm_token);

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fcm_tokens TO authenticated;

-- Comment on table and columns for better documentation
COMMENT ON TABLE public.fcm_tokens IS 'Table to store Firebase Cloud Messaging tokens for push notifications';
COMMENT ON COLUMN public.fcm_tokens.user_id IS 'The user ID from auth.users';
COMMENT ON COLUMN public.fcm_tokens.fcm_token IS 'The Firebase Cloud Messaging token';
COMMENT ON COLUMN public.fcm_tokens.device_info IS 'Information about the device (user agent)';
COMMENT ON COLUMN public.fcm_tokens.created_at IS 'When the token was first registered';
COMMENT ON COLUMN public.fcm_tokens.last_used IS 'When the token was last used or updated'; 