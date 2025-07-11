-- Firebase Cloud Messaging (FCM) Integration Tables
-- This migration creates tables for FCM token management, notification history, and user preferences

-- 1. FCM Tokens Table
-- Stores FCM tokens for each user device
CREATE TABLE IF NOT EXISTS public.fcm_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  device_type TEXT CHECK (device_type IN ('android', 'ios', 'web')) DEFAULT 'web',
  device_info JSONB DEFAULT '{}'::jsonb, -- Store device details like model, OS version, etc.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_used TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_active ON fcm_tokens(is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fcm_tokens_user_token ON fcm_tokens(user_id, token);

-- 2. Notification History Table
-- Track sent notifications for analytics and debugging
CREATE TABLE IF NOT EXISTS public.notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb, -- Additional payload data
  notification_type TEXT DEFAULT 'task' CHECK (notification_type IN ('task', 'announcement', 'reminder', 'system')),
  related_id UUID, -- Reference to task, announcement, etc.
  fcm_token TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'clicked')),
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for notification history
CREATE INDEX IF NOT EXISTS idx_notification_history_user_id ON notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_type ON notification_history(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_history_related_id ON notification_history(related_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_sent_at ON notification_history(sent_at);

-- 3. Notification Preferences Table
-- Allow users to control their notification preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  task_notifications BOOLEAN DEFAULT true,
  announcement_notifications BOOLEAN DEFAULT true,
  reminder_notifications BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for notification preferences
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- 4. Row Level Security (RLS) Policies

-- Enable RLS on FCM tokens table
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own tokens
CREATE POLICY "Users can manage own FCM tokens" ON fcm_tokens
FOR ALL USING (auth.uid() = user_id);

-- Enable RLS on notification history
ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own notification history
CREATE POLICY "Users can view own notification history" ON notification_history
FOR SELECT USING (auth.uid() = user_id);

-- Admins can insert notifications for their sections
CREATE POLICY "Admins can create notifications" ON notification_history
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'section_admin', 'super-admin')
  )
);

-- Enable RLS on notification preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can manage their own preferences
CREATE POLICY "Users can manage own notification preferences" ON notification_preferences
FOR ALL USING (auth.uid() = user_id);

-- 5. Triggers for automatic timestamp updates

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
CREATE TRIGGER update_fcm_tokens_updated_at 
    BEFORE UPDATE ON fcm_tokens 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at 
    BEFORE UPDATE ON notification_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Default notification preferences for existing users
-- Insert default notification preferences for users who don't have them
INSERT INTO notification_preferences (user_id)
SELECT id FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM notification_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- 7. Function to automatically create notification preferences for new users
CREATE OR REPLACE FUNCTION create_notification_preferences_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create notification preferences when a new user is created
CREATE TRIGGER on_auth_user_created_notification_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_notification_preferences_for_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.fcm_tokens TO authenticated;
GRANT ALL ON public.notification_history TO authenticated;
GRANT ALL ON public.notification_preferences TO authenticated;
