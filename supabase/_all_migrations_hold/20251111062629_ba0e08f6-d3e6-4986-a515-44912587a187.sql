-- Safer org-scoped RLS for storage.objects on 'board-documents' bucket
-- Read: same org as object owner
DROP POLICY IF EXISTS "Users can view documents in their org" ON storage.objects;
CREATE POLICY "Users can view org documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'board-documents' AND
  EXISTS (
    SELECT 1
    FROM public.profiles u
    JOIN public.profiles o ON o.id = storage.objects.owner
    WHERE u.id = auth.uid()
      AND u.org_id IS NOT NULL
      AND u.org_id = o.org_id
  )
);

-- Insert: owner must be uploader (default supabase sets owner = auth.uid()) and bucket matches
DROP POLICY IF EXISTS "Users can upload documents to their org" ON storage.objects;
CREATE POLICY "Users can upload org documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK ( bucket_id = 'board-documents' AND owner = auth.uid() );

-- Delete: owner OR org admins (org_admin / super_admin)
DROP POLICY IF EXISTS "Users can delete their uploaded documents" ON storage.objects;
CREATE POLICY "Owners or org admins can delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'board-documents' AND (
    owner = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = auth.uid()
        AND r.role IN ('org_admin','super_admin')
    )
  )
);