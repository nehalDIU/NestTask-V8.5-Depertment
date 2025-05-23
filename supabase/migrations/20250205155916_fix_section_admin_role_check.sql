-- Update the is_section_admin function to handle both role formats
CREATE OR REPLACE FUNCTION is_section_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND (
      auth.users.raw_user_meta_data->>'role' = 'section_admin' OR
      auth.users.raw_user_meta_data->>'role' = 'section-admin'
    )
  );
END;
$$;

-- Update the delete_section_user function to use normalized roles
CREATE OR REPLACE FUNCTION delete_section_user(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  executing_user_role text;
BEGIN
  -- Get the role of the executing user
  SELECT raw_user_meta_data->>'role'
  INTO executing_user_role
  FROM auth.users
  WHERE id = auth.uid();

  -- Check if the executing user is a section admin (either format)
  IF executing_user_role NOT IN ('section_admin', 'section-admin') THEN
    RAISE EXCEPTION 'Only section administrators can use this function';
  END IF;

  -- Check if the user to be deleted belongs to the section admin's section
  IF NOT is_user_in_section(user_id) THEN
    RAISE EXCEPTION 'You can only delete users from your own section';
  END IF;

  -- Delete from public.users first (this will cascade to auth.users)
  DELETE FROM public.users WHERE id = user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_section_user TO authenticated; 