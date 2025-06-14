-- Migration to add a trigger for sending notifications on new announcements.
-- This migration depends on the pg_net extension being enabled in Supabase
-- and the send-fcm-notification Edge Function being deployed.

-- IMPORTANT: Configure the following settings in your Supabase project:
-- 1. Enable the pg_net extension: https://supabase.com/docs/guides/database/extensions/pgnet
-- 2. Set the service role key as a configuration variable in the database:
--    Example: ALTER DATABASE postgres SET app.settings.service_role_key = '[YOUR_SUPABASE_SERVICE_ROLE_KEY]';
--    Replace [YOUR_SUPABASE_SERVICE_ROLE_KEY] with your actual service role key.
--    The function below will attempt to read this using current_setting('app.settings.service_role_key').
-- 3. Ensure your Supabase URL is correctly resolvable. The function attempts to get it via current_setting('supabase.url').
--    If 'supabase.url' is not available, you might need to hardcode project_url or set it as another config variable.

CREATE OR REPLACE FUNCTION public.notify_new_announcement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Necessary to access fcm_tokens table and use pg_net with service role key
AS $$
DECLARE
  notification_title TEXT;
  notification_body TEXT;
  fcm_token_list TEXT[];
  project_url TEXT;
  service_role_key TEXT;
  payload JSONB;
  request_id BIGINT; -- To store the request ID from net.http_post
BEGIN
  -- Attempt to get Supabase project URL and service role key from settings
  -- Fallback to placeholders if not set, though the function will likely fail without them.
  BEGIN
    project_url := current_setting('supabase.url', true);
    IF project_url IS NULL THEN
      RAISE WARNING 'supabase.url setting is not defined. Please set it for the notify_new_announcement function.';
      -- Provide a placeholder or default if absolutely necessary, but configuration is preferred
      project_url := '[YOUR_SUPABASE_URL_FALLBACK]'; -- This will likely not work
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not retrieve supabase.url: %. Using placeholder. Please ensure this setting is available.', SQLERRM;
    project_url := '[YOUR_SUPABASE_URL_FALLBACK]'; -- This will likely not work
  END;

  BEGIN
    service_role_key := current_setting('app.settings.service_role_key', true);
    IF service_role_key IS NULL THEN
      RAISE WARNING 'app.settings.service_role_key is not defined. Please set it for the notify_new_announcement function. Example: ALTER DATABASE postgres SET app.settings.service_role_key = ''YOUR_KEY'';';
      -- The function cannot proceed without the service role key for authenticated requests.
      RETURN NEW; -- Or raise an error
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not retrieve app.settings.service_role_key: %. The function requires this for authentication. Please ensure this setting is available.', SQLERRM;
    RETURN NEW; -- Or raise an error
  END;

  -- Construct notification content
  notification_title := 'New Announcement: ' || NEW.title;
  -- Use a snippet of the content for the body, e.g., first 100 characters
  IF NEW.content IS NOT NULL AND length(NEW.content) > 100 THEN
    notification_body := LEFT(NEW.content, 100) || '...';
  ELSE
    notification_body := NEW.content;
  END IF;

  -- Get all distinct FCM tokens from the public.fcm_tokens table
  SELECT array_agg(DISTINCT fcm_token) INTO fcm_token_list FROM public.fcm_tokens WHERE fcm_token IS NOT NULL;

  -- Check if there are any tokens to send to
  IF fcm_token_list IS NOT NULL AND array_length(fcm_token_list, 1) > 0 THEN
    -- Construct the payload for the Edge Function
    payload := jsonb_build_object(
      'tokens', fcm_token_list,
      'notification', jsonb_build_object(
        'title', notification_title,
        'body', notification_body,
        'icon', '/icons/icon-192x192.png' -- Default icon, consider making this configurable
      ),
      'data', jsonb_build_object(
        'type', 'new_announcement',
        'announcementId', NEW.id::TEXT -- Cast UUID to TEXT if NEW.id is of UUID type
      )
    );

    -- Invoke the Edge Function using pg_net
    -- Ensure the pg_net extension is enabled in your Supabase project.
    SELECT net.http_post(
      url := project_url || '/functions/v1/send-fcm-notification',
      body := payload,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
        -- Supabase Edge Functions are typically protected by the service_role_key.
        -- Ensure this key has permissions if you have specific function-level auth.
      )
    ) INTO request_id; -- Store the request ID if needed for logging or debugging

    RAISE LOG 'Sent new announcement notification for announcement ID % via pg_net. Request ID: %', NEW.id, request_id;

  ELSE
    RAISE LOG 'No FCM tokens found. Skipping notification for announcement ID %.', NEW.id;
  END IF;

  RETURN NEW; -- Return NEW for AFTER INSERT trigger, has no direct effect but is good practice
EXCEPTION
  WHEN OTHERS THEN
    -- Log any error that occurs during function execution
    RAISE WARNING 'Error in notify_new_announcement for announcement ID %: %', NEW.id, SQLERRM;
    -- Optionally, re-raise the error if you want the transaction to fail
    -- RAISE;
    RETURN NEW; -- Still return NEW to not break the insert operation due to notification failure
END;
$$;

-- Create the trigger to execute the function after a new announcement is inserted
CREATE TRIGGER trigger_new_announcement_notification
AFTER INSERT ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_announcement();

COMMENT ON FUNCTION public.notify_new_announcement IS 'Sends a push notification via an Edge Function when a new announcement is created. Requires pg_net and specific configuration variables (supabase.url, app.settings.service_role_key).';
COMMENT ON TRIGGER trigger_new_announcement_notification ON public.announcements IS 'After each new announcement is inserted, triggers the notify_new_announcement function to send push notifications.';

-- Note: To make this robust, consider adding error handling for the HTTP request,
-- and potentially a retry mechanism or queuing system if the Edge Function invocation fails.
-- Also, ensure your `announcements` table has an `id` column (assumed UUID here), `title`, and `content`.
-- If `id` is not UUID, adjust `NEW.id::TEXT` cast accordingly.
-- If `fcm_tokens` table schema is different, adjust the query.
