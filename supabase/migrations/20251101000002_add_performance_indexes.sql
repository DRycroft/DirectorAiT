-- Add performance indexes for frequently queried columns

-- Board members indexes
CREATE INDEX IF NOT EXISTS idx_board_members_org_id ON board_members(org_id);
CREATE INDEX IF NOT EXISTS idx_board_members_user_id ON board_members(user_id);

-- Board papers indexes
CREATE INDEX IF NOT EXISTS idx_board_papers_board_id ON board_papers(board_id);
CREATE INDEX IF NOT EXISTS idx_board_papers_created_by ON board_papers(created_by);
CREATE INDEX IF NOT EXISTS idx_board_papers_org_id ON board_papers(org_id);

-- Archived documents indexes
CREATE INDEX IF NOT EXISTS idx_archived_documents_org_id ON archived_documents(org_id);
CREATE INDEX IF NOT EXISTS idx_archived_documents_uploaded_by ON archived_documents(uploaded_by);

-- Compliance items indexes
CREATE INDEX IF NOT EXISTS idx_compliance_items_org_id ON compliance_items(org_id);
CREATE INDEX IF NOT EXISTS idx_compliance_items_next_due_date ON compliance_items(next_due_date);

-- Board memberships indexes
CREATE INDEX IF NOT EXISTS idx_board_memberships_board_id ON board_memberships(board_id);
CREATE INDEX IF NOT EXISTS idx_board_memberships_user_id ON board_memberships(user_id);

-- Add comments
COMMENT ON INDEX idx_board_members_org_id IS 'Improves query performance for organization-specific board member lookups';
COMMENT ON INDEX idx_compliance_items_next_due_date IS 'Improves query performance for upcoming compliance items';
