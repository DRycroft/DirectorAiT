-- Temporarily relax the boards RLS policies to allow org members to manage boards
-- This can be tightened later once admin roles are properly assigned

-- Drop the strict admin-only policies
DROP POLICY IF EXISTS "Org admins can create boards" ON boards;
DROP POLICY IF EXISTS "Org admins can update boards" ON boards;
DROP POLICY IF EXISTS "Org admins can delete boards" ON boards;

-- Create more permissive policies for org members
CREATE POLICY "Org members can create boards"
ON boards FOR INSERT
WITH CHECK (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Org members can update boards"
ON boards FOR UPDATE
USING (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Org members can delete boards"
ON boards FOR DELETE
USING (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);