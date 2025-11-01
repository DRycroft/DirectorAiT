-- Add member_type and position fields to board_members table
ALTER TABLE public.board_members 
ADD COLUMN member_type TEXT DEFAULT 'board' CHECK (member_type IN ('board', 'executive', 'key_staff')),
ADD COLUMN position TEXT;

-- Add comments for clarity
COMMENT ON COLUMN public.board_members.member_type IS 'Type of member: board, executive, or key_staff';
COMMENT ON COLUMN public.board_members.position IS 'Specific position: chair, deputy_chair, ceo, cfo, etc.';

-- Create index for efficient filtering
CREATE INDEX idx_board_members_type_board ON public.board_members(board_id, member_type, status);