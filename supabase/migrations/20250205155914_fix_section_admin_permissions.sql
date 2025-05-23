-- Create helper function to check if a user is a section admin
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
    AND auth.users.raw_user_meta_data->>'role' = 'section_admin'
  );
END;
$$;

-- Create helper function to check if a user belongs to the section admin's section
CREATE OR REPLACE FUNCTION is_user_in_section(target_user_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_section_id text;
BEGIN
  -- Get the section_id of the executing section admin
  SELECT section_id INTO admin_section_id
  FROM users
  WHERE id = auth.uid();

  -- Check if the target user belongs to the same section
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = target_user_id
    AND section_id = admin_section_id
  );
END;
$$;

-- Create function for section admins to delete users
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

  -- Check if the executing user is a section admin
  IF executing_user_role != 'section_admin' THEN
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

-- Update the delete policy for users table
DROP POLICY IF EXISTS "Enable delete for admins" ON users;
CREATE POLICY "Enable delete for admins"
  ON users
  FOR DELETE
  TO authenticated
  USING (
    -- Allow super admins and regular admins to delete any user
    (EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.raw_user_meta_data->>'role' = 'admin' OR
        auth.users.raw_user_meta_data->>'role' = 'super-admin'
      )
    ))
    OR
    -- Allow section admins to delete only users in their section
    (
      is_section_admin() AND
      is_user_in_section(id)
    )
  ); 