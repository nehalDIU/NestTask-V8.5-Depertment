-- Create function to normalize role values
CREATE OR REPLACE FUNCTION normalize_role(role_value text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  -- Convert section-admin to section_admin for consistency
  IF role_value = 'section-admin' THEN
    RETURN 'section_admin';
  ELSE
    RETURN role_value;
  END IF;
END;
$$;

-- Update existing users to normalize role values
UPDATE users
SET role = normalize_role(role)
WHERE role = 'section-admin';

-- Create trigger to normalize role values on insert/update
CREATE OR REPLACE FUNCTION normalize_role_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.role = normalize_role(NEW.role);
  RETURN NEW;
END;
$$;

-- Add trigger to users table
DROP TRIGGER IF EXISTS normalize_role_trigger ON users;
CREATE TRIGGER normalize_role_trigger
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION normalize_role_trigger();

-- Update auth.users metadata to match
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data,
  '{role}',
  to_jsonb('section_admin'::text)
)
WHERE raw_user_meta_data->>'role' = 'section-admin'; 