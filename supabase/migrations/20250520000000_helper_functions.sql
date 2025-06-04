-- Create helper functions for the application

-- Simple ping function for connection testing
CREATE OR REPLACE FUNCTION public.ping()
RETURNS text AS $$
BEGIN
  RETURN 'pong';
END;
$$ LANGUAGE plpgsql;

-- Helper functions for FCM token management

-- Function to update FCM token with proper escaping of special characters
CREATE OR REPLACE FUNCTION public.update_fcm_token(
    p_user_id UUID,
    p_token TEXT,
    p_device_info JSONB
) RETURNS BOOLEAN AS $$
DECLARE
    v_token_exists BOOLEAN;
    v_result BOOLEAN;
BEGIN
    -- Check if token exists using a safe query approach
    SELECT EXISTS (
        SELECT 1 FROM public.fcm_tokens 
        WHERE encode(digest(fcm_token, 'sha256'), 'hex') = encode(digest(p_token, 'sha256'), 'hex')
    ) INTO v_token_exists;
    
    IF v_token_exists THEN
        -- Update the existing token
        UPDATE public.fcm_tokens
        SET user_id = p_user_id,
            last_used = NOW(),
            device_info = p_device_info,
            is_active = TRUE
        WHERE encode(digest(fcm_token, 'sha256'), 'hex') = encode(digest(p_token, 'sha256'), 'hex');
        
        v_result := FOUND;
    ELSE
        -- Insert new token
        INSERT INTO public.fcm_tokens (
            user_id,
            fcm_token,
            device_info,
            is_active
        ) VALUES (
            p_user_id,
            p_token,
            p_device_info,
            TRUE
        );
        
        v_result := TRUE;
    END IF;
    
    RETURN v_result;
EXCEPTION
    WHEN unique_violation THEN
        -- If we hit a unique constraint, try again with update
        UPDATE public.fcm_tokens
        SET user_id = p_user_id,
            last_used = NOW(),
            device_info = p_device_info,
            is_active = TRUE
        WHERE encode(digest(fcm_token, 'sha256'), 'hex') = encode(digest(p_token, 'sha256'), 'hex');
        
        RETURN FOUND;
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in update_fcm_token: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get a user's active FCM tokens safely
CREATE OR REPLACE FUNCTION public.get_user_fcm_tokens(
    p_user_id UUID
) RETURNS TABLE (
    id UUID,
    user_id UUID,
    fcm_token TEXT,
    created_at TIMESTAMPTZ,
    last_used TIMESTAMPTZ,
    device_info JSONB,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.user_id, t.fcm_token, t.created_at, t.last_used, t.device_info, t.is_active
    FROM public.fcm_tokens t
    WHERE t.user_id = p_user_id
    AND t.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete FCM token by token value safely
CREATE OR REPLACE FUNCTION public.delete_fcm_token(
    p_token TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_result BOOLEAN;
BEGIN
    DELETE FROM public.fcm_tokens
    WHERE encode(digest(fcm_token, 'sha256'), 'hex') = encode(digest(p_token, 'sha256'), 'hex');
    
    v_result := FOUND;
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in delete_fcm_token: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deactivate all tokens for a user
CREATE OR REPLACE FUNCTION public.deactivate_user_tokens(
    p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.fcm_tokens
    SET is_active = FALSE
    WHERE user_id = p_user_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in deactivate_user_tokens: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
GRANT EXECUTE ON FUNCTION public.update_fcm_token TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_fcm_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_fcm_token TO authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_user_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO authenticated; 