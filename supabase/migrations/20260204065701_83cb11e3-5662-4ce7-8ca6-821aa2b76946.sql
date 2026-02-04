-- Fix storage bucket org-level isolation for all 4 buckets
-- This replaces insecure policies with org-scoped policies using profiles.org_id
-- owner_id is TEXT, auth.uid() returns UUID - need explicit cast

-- ============================================
-- board-documents bucket
-- ============================================

-- Drop existing insecure policies
DROP POLICY IF EXISTS "Users can view documents in their org" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload documents to their org" ON storage.objects;
DROP POLICY IF EXISTS "Users can view org documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload org documents" ON storage.objects;

-- Create org-isolated SELECT policy for board-documents
CREATE POLICY "board_documents_select_org_isolated"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'board-documents' AND
  (storage.foldername(name))[1] = (
    SELECT COALESCE(org_id::text, '') FROM public.profiles WHERE id = auth.uid()
  )
);

-- Create org-isolated INSERT policy for board-documents  
CREATE POLICY "board_documents_insert_org_isolated"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'board-documents' AND
  (storage.foldername(name))[1] = (
    SELECT COALESCE(org_id::text, '') FROM public.profiles WHERE id = auth.uid()
  )
);

-- Create owner-based UPDATE policy for board-documents
CREATE POLICY "board_documents_update_owner"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'board-documents' AND owner_id = auth.uid()::text
);

-- Create owner-based DELETE policy for board-documents
DROP POLICY IF EXISTS "Owners or org admins can delete" ON storage.objects;
CREATE POLICY "board_documents_delete_owner"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'board-documents' AND owner_id = auth.uid()::text
);

-- ============================================
-- executive-reports bucket
-- ============================================

-- Drop existing insecure policies
DROP POLICY IF EXISTS "Users can upload reports to their org folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view reports in their org" ON storage.objects;

-- Create org-isolated SELECT policy for executive-reports
CREATE POLICY "executive_reports_select_org_isolated"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'executive-reports' AND
  (storage.foldername(name))[1] = (
    SELECT COALESCE(org_id::text, '') FROM public.profiles WHERE id = auth.uid()
  )
);

-- Create org-isolated INSERT policy for executive-reports
CREATE POLICY "executive_reports_insert_org_isolated"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'executive-reports' AND
  (storage.foldername(name))[1] = (
    SELECT COALESCE(org_id::text, '') FROM public.profiles WHERE id = auth.uid()
  )
);

-- Create owner-based UPDATE policy for executive-reports
CREATE POLICY "executive_reports_update_owner"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'executive-reports' AND owner_id = auth.uid()::text
);

-- Create owner-based DELETE policy for executive-reports
CREATE POLICY "executive_reports_delete_owner"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'executive-reports' AND owner_id = auth.uid()::text
);

-- ============================================
-- meeting-minutes bucket
-- ============================================

-- Drop existing insecure policies
DROP POLICY IF EXISTS "Users can upload minutes to their org folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view minutes in their org" ON storage.objects;

-- Create org-isolated SELECT policy for meeting-minutes
CREATE POLICY "meeting_minutes_select_org_isolated"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'meeting-minutes' AND
  (storage.foldername(name))[1] = (
    SELECT COALESCE(org_id::text, '') FROM public.profiles WHERE id = auth.uid()
  )
);

-- Create org-isolated INSERT policy for meeting-minutes
CREATE POLICY "meeting_minutes_insert_org_isolated"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'meeting-minutes' AND
  (storage.foldername(name))[1] = (
    SELECT COALESCE(org_id::text, '') FROM public.profiles WHERE id = auth.uid()
  )
);

-- Create owner-based UPDATE policy for meeting-minutes
CREATE POLICY "meeting_minutes_update_owner"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'meeting-minutes' AND owner_id = auth.uid()::text
);

-- Create owner-based DELETE policy for meeting-minutes
CREATE POLICY "meeting_minutes_delete_owner"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'meeting-minutes' AND owner_id = auth.uid()::text
);

-- ============================================
-- special-papers bucket
-- ============================================

-- Drop existing insecure policies
DROP POLICY IF EXISTS "Users can upload special papers to their org folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view special papers in their org" ON storage.objects;

-- Create org-isolated SELECT policy for special-papers
CREATE POLICY "special_papers_select_org_isolated"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'special-papers' AND
  (storage.foldername(name))[1] = (
    SELECT COALESCE(org_id::text, '') FROM public.profiles WHERE id = auth.uid()
  )
);

-- Create org-isolated INSERT policy for special-papers
CREATE POLICY "special_papers_insert_org_isolated"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'special-papers' AND
  (storage.foldername(name))[1] = (
    SELECT COALESCE(org_id::text, '') FROM public.profiles WHERE id = auth.uid()
  )
);

-- Create owner-based UPDATE policy for special-papers
CREATE POLICY "special_papers_update_owner"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'special-papers' AND owner_id = auth.uid()::text
);

-- Create owner-based DELETE policy for special-papers
CREATE POLICY "special_papers_delete_owner"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'special-papers' AND owner_id = auth.uid()::text
);