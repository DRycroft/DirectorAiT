-- Add custom_fields column to board_members to store custom field data
ALTER TABLE board_members 
ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN board_members.custom_fields IS 'Stores custom field data defined in staff form templates';