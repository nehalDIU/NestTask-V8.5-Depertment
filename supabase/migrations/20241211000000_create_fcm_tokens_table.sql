-- Create FCM tokens table for push notifications
CREATE TABLE IF NOT EXISTS public.fcm_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fcm_token TEXT NOT NULL,
    device_info JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    -- Ensure one token per user (upsert behavior)
    UNIQUE(user_id, fcm_token)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON public.fcm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_active ON public.fcm_tokens(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_token ON public.fcm_tokens(fcm_token);

-- Enable RLS (Row Level Security)
ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own FCM tokens" ON public.fcm_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own FCM tokens" ON public.fcm_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own FCM tokens" ON public.fcm_tokens
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own FCM tokens" ON public.fcm_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- Allow service role to read all tokens (for sending notifications)
CREATE POLICY "Service role can read all FCM tokens" ON public.fcm_tokens
    FOR SELECT USING (auth.role() = 'service_role');

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_fcm_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.last_used = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update the updated_at timestamp
CREATE TRIGGER update_fcm_tokens_updated_at_trigger
    BEFORE UPDATE ON public.fcm_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_fcm_tokens_updated_at();

-- Create function to clean up old/inactive tokens
CREATE OR REPLACE FUNCTION cleanup_old_fcm_tokens()
RETURNS void AS $$
BEGIN
    -- Mark tokens as inactive if not used for 30 days
    UPDATE public.fcm_tokens 
    SET is_active = false 
    WHERE last_used < NOW() - INTERVAL '30 days' 
    AND is_active = true;
    
    -- Delete tokens that have been inactive for 90 days
    DELETE FROM public.fcm_tokens 
    WHERE is_active = false 
    AND updated_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fcm_tokens TO authenticated;
GRANT SELECT ON public.fcm_tokens TO anon;

-- Insert some sample data for testing (optional)
-- This will be ignored if the table already has data
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.fcm_tokens LIMIT 1) THEN
        INSERT INTO public.fcm_tokens (user_id, fcm_token, device_info) 
        VALUES (
            (SELECT id FROM auth.users LIMIT 1),
            'sample_fcm_token_for_testing',
            '{"browser": "Chrome", "platform": "Web", "userAgent": "Sample"}'
        ) ON CONFLICT DO NOTHING;
    END IF;
END $$;
