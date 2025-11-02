-- Add missing fields to board_members table for comprehensive team member profiles

ALTER TABLE board_members 
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS reports_to uuid REFERENCES board_members(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reports_responsible_for jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS personal_interests text,
ADD COLUMN IF NOT EXISTS health_notes text;

-- Add index for reports_to for better query performance
CREATE INDEX IF NOT EXISTS idx_board_members_reports_to ON board_members(reports_to);

-- Add comment to clarify health_notes is sensitive
COMMENT ON COLUMN board_members.health_notes IS 'Sensitive: Health information voluntarily shared by team member';