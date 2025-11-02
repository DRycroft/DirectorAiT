-- Add board type and archiving support
ALTER TABLE boards 
ADD COLUMN IF NOT EXISTS board_type text DEFAULT 'main' CHECK (board_type IN ('main', 'sub_committee', 'special_purpose')),
ADD COLUMN IF NOT EXISTS parent_board_id uuid REFERENCES boards(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'archived')),
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS committee_purpose text;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_boards_status ON boards(status);
CREATE INDEX IF NOT EXISTS idx_boards_parent ON boards(parent_board_id);
CREATE INDEX IF NOT EXISTS idx_boards_org_status ON boards(org_id, status);

-- Add RLS policy for board creation
CREATE POLICY "Org admins can create boards"
ON boards FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'org_admin'::app_role) 
  AND org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);

-- Add RLS policy for board updates
CREATE POLICY "Org admins can update boards"
ON boards FOR UPDATE
USING (
  has_role(auth.uid(), 'org_admin'::app_role)
  AND org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);

-- Add RLS policy for board deletion (archiving)
CREATE POLICY "Org admins can delete boards"
ON boards FOR DELETE
USING (
  has_role(auth.uid(), 'org_admin'::app_role)
  AND org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);