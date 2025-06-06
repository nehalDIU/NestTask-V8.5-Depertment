-- Extend the FCM tokens table with additional fields and indexes

-- Add new columns for better device tracking and token management
ALTER TABLE public.fcm_tokens
ADD COLUMN IF NOT EXISTS device_name TEXT,
ADD COLUMN IF NOT EXISTS device_type TEXT,
ADD COLUMN IF NOT EXISTS platform TEXT,
ADD COLUMN IF NOT EXISTS app_version TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{"task_alerts": true, "announcements": true, "reminders": true}'::JSONB;

-- Add custom device identifier column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'fcm_tokens' 
    AND column_name = 'device_id'
  ) THEN
    ALTER TABLE public.fcm_tokens ADD COLUMN device_id TEXT;
    
    -- Create a function to generate a device ID from device_info for legacy records
    CREATE OR REPLACE FUNCTION generate_device_id() RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.device_id IS NULL THEN
        -- Generate a simple hash-based device ID from device info
        NEW.device_id = 'device_' || encode(sha256(NEW.device_info::bytea), 'hex');
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Add trigger to auto-generate device_id
    CREATE TRIGGER before_insert_fcm_tokens
    BEFORE INSERT ON public.fcm_tokens
    FOR EACH ROW
    EXECUTE FUNCTION generate_device_id();
    
    -- Update existing records with generated device IDs
    UPDATE public.fcm_tokens
    SET device_id = 'device_' || encode(sha256(device_info::bytea), 'hex')
    WHERE device_id IS NULL AND device_info IS NOT NULL;
  END IF;
END $$;

-- Add a unique constraint on user_id and device_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_user_device'
  ) THEN
    ALTER TABLE public.fcm_tokens
    ADD CONSTRAINT unique_user_device UNIQUE (user_id, device_id);
  END IF;
END $$;

-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_device_id ON public.fcm_tokens(device_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_device_type ON public.fcm_tokens(device_type);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_is_active ON public.fcm_tokens(is_active);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_last_used ON public.fcm_tokens(last_used);

-- Create function to clean up old tokens
CREATE OR REPLACE FUNCTION cleanup_old_fcm_tokens() RETURNS void AS $$
BEGIN
  -- Delete tokens not used in the last 90 days
  DELETE FROM public.fcm_tokens
  WHERE last_used < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Create a function for token reconciliation (to avoid duplicates per device)
CREATE OR REPLACE FUNCTION reconcile_fcm_tokens() RETURNS TRIGGER AS $$
BEGIN
  -- If a new token is inserted and device_id exists for the same user,
  -- update the existing record instead of creating a duplicate
  IF (TG_OP = 'INSERT') THEN
    -- If we have duplicate device_id for same user, update the existing record
    IF EXISTS (
      SELECT 1 FROM public.fcm_tokens 
      WHERE user_id = NEW.user_id 
      AND device_id = NEW.device_id
      AND id != NEW.id
    ) THEN
      -- Update the existing record with the new token
      UPDATE public.fcm_tokens 
      SET 
        fcm_token = NEW.fcm_token,
        last_used = NEW.last_used,
        device_info = NEW.device_info,
        is_active = TRUE
      WHERE user_id = NEW.user_id 
      AND device_id = NEW.device_id
      AND id != NEW.id;
      
      -- Return NULL to prevent the insertion
      RETURN NULL;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for token reconciliation
DROP TRIGGER IF EXISTS before_insert_fcm_tokens_reconcile ON public.fcm_tokens;
CREATE TRIGGER before_insert_fcm_tokens_reconcile
BEFORE INSERT ON public.fcm_tokens
FOR EACH ROW
EXECUTE FUNCTION reconcile_fcm_tokens(); 