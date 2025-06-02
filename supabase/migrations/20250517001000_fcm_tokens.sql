-- Create fcm_tokens table to store Firebase Cloud Messaging tokens
CREATE TABLE IF NOT EXISTS public.fcm_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    fcm_token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    device_info JSONB DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON public.fcm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_token ON public.fcm_tokens(fcm_token);

-- Add RLS policies
ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Allow users to view and manage their own tokens
CREATE POLICY "Users can view their own FCM tokens" ON public.fcm_tokens
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own FCM tokens" ON public.fcm_tokens
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own FCM tokens" ON public.fcm_tokens
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own FCM tokens" ON public.fcm_tokens
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Create function to update last_used timestamp
CREATE OR REPLACE FUNCTION public.update_fcm_token_last_used()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_used = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update last_used on token update
CREATE TRIGGER update_fcm_token_last_used
    BEFORE UPDATE ON public.fcm_tokens
    FOR EACH ROW
    EXECUTE FUNCTION public.update_fcm_token_last_used(); 