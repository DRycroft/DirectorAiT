-- ============================================================================
-- CORRECTED Performance Indexes Migration
-- ============================================================================
-- 
-- ISSUE IDENTIFIED:
-- The original migration attempted to create indexes and comments for columns
-- that don't exist in the actual database schema:
--   - board_members.org_id (does NOT exist - board_members only has board_id and user_id)
--
-- Additionally, several indexes already exist in the baseline schema and would
-- cause conflicts if we tried to create them again.
--
-- SOLUTION:
-- This corrected version:
--   1. REMOVES the invalid board_members.org_id index and comment
--   2. REMOVES duplicate indexes that already exist in baseline schema
--   3. KEEPS only the new, valid indexes that will improve performance
--
-- ============================================================================

-- Add performance indexes for frequently queried columns

-- ============================================================================
-- REMOVED (INVALID - column doesn't exist):
-- CREATE INDEX IF NOT EXISTS idx_board_members_org_id ON board_members(org_id);
-- COMMENT ON INDEX idx_board_members_org_id IS '...';
-- 
-- board_members table only has: board_id, user_id (no org_id column)
-- ============================================================================

-- ============================================================================
-- REMOVED (ALREADY EXISTS in baseline schema):
-- - idx_board_papers_created_by (already exists)
-- - idx_board_papers_org_id (already exists as idx_board_papers_org_id)
-- - idx_archived_documents_org_id (already exists as idx_archived_documents_org)
-- - idx_board_memberships_board_id (already exists as idx_board_memberships_board)
-- - idx_board_memberships_user_id (already exists as idx_board_memberships_user)
-- ============================================================================

-- ============================================================================
-- NEW INDEXES (safe to add):
-- ============================================================================

-- Board members indexes
-- Note: board_members does NOT have org_id, only board_id and user_id
CREATE INDEX IF NOT EXISTS idx_board_members_user_id ON board_members(user_id);

-- Board papers indexes
-- Note: board_id index is new (org_id and created_by already exist)
CREATE INDEX IF NOT EXISTS idx_board_papers_board_id ON board_papers(board_id);

-- Archived documents indexes
-- Note: uploaded_by is new (org_id already exists)
CREATE INDEX IF NOT EXISTS idx_archived_documents_uploaded_by ON archived_documents(uploaded_by);

-- Compliance items indexes
-- Note: Both of these are new
CREATE INDEX IF NOT EXISTS idx_compliance_items_org_id ON compliance_items(org_id);
CREATE INDEX IF NOT EXISTS idx_compliance_items_next_due_date ON compliance_items(next_due_date);

-- ============================================================================
-- Add comments (only for indexes that actually exist)
-- ============================================================================

COMMENT ON INDEX idx_compliance_items_next_due_date IS 'Improves query performance for upcoming compliance items';

-- ============================================================================
-- SUMMARY OF CHANGES:
-- ============================================================================
-- ✅ Added: idx_board_members_user_id (new)
-- ✅ Added: idx_board_papers_board_id (new)
-- ✅ Added: idx_archived_documents_uploaded_by (new)
-- ✅ Added: idx_compliance_items_org_id (new)
-- ✅ Added: idx_compliance_items_next_due_date (new)
-- ❌ Removed: idx_board_members_org_id (column doesn't exist)
-- ❌ Removed: Duplicate indexes that already exist in baseline
-- ============================================================================
