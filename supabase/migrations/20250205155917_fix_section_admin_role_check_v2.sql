-- Update the is_section_admin function to check both auth metadata and public.users table
CREATE OR REPLACE FUNCTION is_section_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM auth.users au
    JOIN public.users pu ON au.id = pu.id
    WHERE au.id = auth.uid()
    AND (
      -- Check auth.users metadata
      au.raw_user_meta_data->>'role' IN ('section_admin', 'section-admin')
      OR
      -- Check public.users role column
      pu.role IN ('section_admin', 'section-admin')
    )
  );
END;
$$;

-- Update the delete_section_user function to use both role checks
CREATE OR REPLACE FUNCTION delete_section_user(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  executing_user_role text;
  executing_user_db_role text;
BEGIN
  -- Get the role from both auth metadata and public.users
  SELECT 
    au.raw_user_meta_data->>'role',
    pu.role
  INTO 
    executing_user_role,
    executing_user_db_role
  FROM auth.users au
  JOIN public.users pu ON au.id = pu.id
  WHERE au.id = auth.uid();

  -- Check if the executing user is a section admin (either format, either location)
  IF NOT (
    executing_user_role IN ('section_admin', 'section-admin') OR
    executing_user_db_role IN ('section_admin', 'section-admin')
  ) THEN
    RAISE EXCEPTION 'Only section administrators can use this function';
  END IF;

  -- Check if the user to be deleted belongs to the section admin's section
  IF NOT EXISTS (
    SELECT 1
    FROM public.users admin_user
    JOIN public.users target_user ON admin_user.section_id = target_user.section_id
    WHERE admin_user.id = auth.uid()
    AND target_user.id = user_id
  ) THEN
    RAISE EXCEPTION 'You can only delete users from your own section';
  END IF;

  -- Delete from public.users first (this will cascade to auth.users)
  DELETE FROM public.users WHERE id = user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_section_user TO authenticated; 