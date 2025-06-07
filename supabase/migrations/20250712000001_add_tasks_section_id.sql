-- Add section_id column to tasks if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'tasks' AND column_name = 'section_id'
    ) THEN
        ALTER TABLE tasks ADD COLUMN section_id UUID REFERENCES sections(id);
        CREATE INDEX tasks_section_id_idx ON tasks(section_id);
    END IF;
END
$$;

-- Create function to check if user is section admin
CREATE OR REPLACE FUNCTION is_section_admin(section_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM section_admins
        WHERE user_id = auth.uid()
        AND section_id = section_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update SELECT policy
DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
CREATE POLICY "Users can view their own tasks or section tasks" ON tasks
FOR SELECT USING (
    auth.uid() = user_id
    OR (
        section_id IN (
            SELECT section_id FROM users
            WHERE id = auth.uid()
        )
    )
);

-- Update INSERT policy
DROP POLICY IF EXISTS "Users can create tasks" ON tasks;
CREATE POLICY "Users can create tasks for themselves or for their section if admin" ON tasks
FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR (
        is_section_admin(section_id)
    )
);

-- Update UPDATE policy
DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
CREATE POLICY "Users can update their own tasks or section tasks if admin" ON tasks
FOR UPDATE USING (
    auth.uid() = user_id
    OR (
        is_section_admin(section_id)
    )
) WITH CHECK (
    auth.uid() = user_id
    OR (
        is_section_admin(section_id)
    )
);

-- Update DELETE policy
DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;
CREATE POLICY "Users can delete their own tasks or section tasks if admin" ON tasks
FOR DELETE USING (
    auth.uid() = user_id
    OR (
        is_section_admin(section_id)
    )
); 