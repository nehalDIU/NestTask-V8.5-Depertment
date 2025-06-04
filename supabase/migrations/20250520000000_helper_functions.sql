-- Create helper functions for the application

-- Simple ping function for connection testing
CREATE OR REPLACE FUNCTION public.ping()
RETURNS text AS $$
BEGIN
  RETURN 'pong';
END;
$$ LANGUAGE plpgsql;

-- Function to update FCM token
CREATE OR REPLACE FUNCTION public.update_fcm_token(
  p_user_id uuid,
  p_token text,
  p_device_info jsonb
) RETURNS void AS $$
BEGIN
  UPDATE public.fcm_tokens
  SET 
    user_id = p_user_id,
    last_used = NOW(),
    device_info = p_device_info,
    is_active = true
  WHERE fcm_token = p_token;
END;
$$ LANGUAGE plpgsql;

-- Function to execute SQL safely (for emergency use only)
CREATE OR REPLACE FUNCTION public.exec_sql(sql_query text)
RETURNS text AS $$
BEGIN
  EXECUTE sql_query;
  RETURN 'SQL executed successfully';
EXCEPTION WHEN OTHERS THEN
  RETURN 'Error: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Grant appropriate permissions
GRANT EXECUTE ON FUNCTION public.ping() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_fcm_token(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO authenticated; 