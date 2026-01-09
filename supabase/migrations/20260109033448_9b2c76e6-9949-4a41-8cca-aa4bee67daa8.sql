-- Fix storage.objects RLS policies for board-documents bucket
-- Replace overly permissive 'to public' policies with authenticated + org-scoped policies

-- Drop existing insecure policies for board-documents bucket
DROP POLICY IF EXISTS "Give users access to own folder 1oj01fe_0" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1oj01fe_1" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder 1oj01fe_2" ON storage.objects;
DROP POLICY IF EXISTS "Users can view org documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload org documents" ON storage.objects;
DROP POLICY IF EXISTS "Owners or org admins can delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to board-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads from board-documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow owner deletes from board-documents" ON storage.objects;

-- Create secure org-scoped SELECT policy for board-documents
-- Users can only view files uploaded by members of the same organization
CREATE POLICY "Org members can view board documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'board-documents' AND
  EXISTS (
    SELECT 1
    FROM public.profiles viewer
    JOIN public.profiles uploader ON uploader.id = storage.objects.owner
    WHERE viewer.id = auth.uid()
      AND viewer.org_id IS NOT NULL
      AND viewer.org_id = uploader.org_id
  )
);

-- Create secure org-scoped INSERT policy for board-documents
-- Users can only upload if they're authenticated and owner is set to their id
CREATE POLICY "Org members can upload board documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'board-documents' AND
  owner = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND org_id IS NOT NULL
  )
);

-- Create secure org-scoped UPDATE policy for board-documents
-- Only the owner can update their own files
CREATE POLICY "Owners can update board documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'board-documents' AND
  owner = auth.uid()
)
WITH CHECK (
  bucket_id = 'board-documents' AND
  owner = auth.uid()
);

-- Create secure DELETE policy for board-documents
-- Owner or org admins can delete files
CREATE POLICY "Owners or org admins can delete board documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'board-documents' AND (
    owner = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = auth.uid()
        AND r.role IN ('org_admin', 'super_admin')
    )
  )
);

-- Also fix policies for other sensitive buckets: executive-reports, meeting-minutes, special-papers

-- Drop existing policies for executive-reports
DROP POLICY IF EXISTS "Give users access to own folder executive_0" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder executive_1" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder executive_2" ON storage.objects;

-- Create secure policies for executive-reports
CREATE POLICY "Org members can view executive reports"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'executive-reports' AND
  EXISTS (
    SELECT 1
    FROM public.profiles viewer
    JOIN public.profiles uploader ON uploader.id = storage.objects.owner
    WHERE viewer.id = auth.uid()
      AND viewer.org_id IS NOT NULL
      AND viewer.org_id = uploader.org_id
  )
);

CREATE POLICY "Org members can upload executive reports"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'executive-reports' AND
  owner = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND org_id IS NOT NULL
  )
);

CREATE POLICY "Owners can update executive reports"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'executive-reports' AND owner = auth.uid())
WITH CHECK (bucket_id = 'executive-reports' AND owner = auth.uid());

CREATE POLICY "Owners or org admins can delete executive reports"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'executive-reports' AND (
    owner = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = auth.uid()
        AND r.role IN ('org_admin', 'super_admin')
    )
  )
);

-- Drop existing policies for meeting-minutes
DROP POLICY IF EXISTS "Give users access to own folder minutes_0" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder minutes_1" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder minutes_2" ON storage.objects;

-- Create secure policies for meeting-minutes
CREATE POLICY "Org members can view meeting minutes"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'meeting-minutes' AND
  EXISTS (
    SELECT 1
    FROM public.profiles viewer
    JOIN public.profiles uploader ON uploader.id = storage.objects.owner
    WHERE viewer.id = auth.uid()
      AND viewer.org_id IS NOT NULL
      AND viewer.org_id = uploader.org_id
  )
);

CREATE POLICY "Org members can upload meeting minutes"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'meeting-minutes' AND
  owner = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND org_id IS NOT NULL
  )
);

CREATE POLICY "Owners can update meeting minutes"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'meeting-minutes' AND owner = auth.uid())
WITH CHECK (bucket_id = 'meeting-minutes' AND owner = auth.uid());

CREATE POLICY "Owners or org admins can delete meeting minutes"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'meeting-minutes' AND (
    owner = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = auth.uid()
        AND r.role IN ('org_admin', 'super_admin')
    )
  )
);

-- Drop existing policies for special-papers
DROP POLICY IF EXISTS "Give users access to own folder papers_0" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder papers_1" ON storage.objects;
DROP POLICY IF EXISTS "Give users access to own folder papers_2" ON storage.objects;

-- Create secure policies for special-papers
CREATE POLICY "Org members can view special papers"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'special-papers' AND
  EXISTS (
    SELECT 1
    FROM public.profiles viewer
    JOIN public.profiles uploader ON uploader.id = storage.objects.owner
    WHERE viewer.id = auth.uid()
      AND viewer.org_id IS NOT NULL
      AND viewer.org_id = uploader.org_id
  )
);

CREATE POLICY "Org members can upload special papers"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'special-papers' AND
  owner = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND org_id IS NOT NULL
  )
);

CREATE POLICY "Owners can update special papers"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'special-papers' AND owner = auth.uid())
WITH CHECK (bucket_id = 'special-papers' AND owner = auth.uid());

CREATE POLICY "Owners or org admins can delete special papers"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'special-papers' AND (
    owner = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = auth.uid()
        AND r.role IN ('org_admin', 'super_admin')
    )
  )
);