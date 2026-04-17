-- Drop existing org-wide SELECT policies on the 4 protected buckets
DROP POLICY IF EXISTS "Users can view org documents" ON storage.objects;
DROP POLICY IF EXISTS "Org members can view board documents" ON storage.objects;
DROP POLICY IF EXISTS "Org members can view executive reports" ON storage.objects;
DROP POLICY IF EXISTS "Org members can view meeting minutes" ON storage.objects;
DROP POLICY IF EXISTS "Org members can view special papers" ON storage.objects;

-- Helper inline expression: path is "<org_id>/<board_id>/..."
-- (storage.foldername(name))[1] = org_id
-- (storage.foldername(name))[2] = board_id

CREATE POLICY "Board members can view board documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'board-documents'
  AND (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(
         auth.uid(),
         'org_admin'::public.app_role,
         ((storage.foldername(name))[1])::uuid
       )
    OR EXISTS (
      SELECT 1 FROM public.board_memberships m
      WHERE m.user_id = auth.uid()
        AND m.board_id::text = (storage.foldername(name))[2]
    )
  )
);

CREATE POLICY "Board members can view executive reports"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'executive-reports'
  AND (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(
         auth.uid(),
         'org_admin'::public.app_role,
         ((storage.foldername(name))[1])::uuid
       )
    OR EXISTS (
      SELECT 1 FROM public.board_memberships m
      WHERE m.user_id = auth.uid()
        AND m.board_id::text = (storage.foldername(name))[2]
    )
  )
);

CREATE POLICY "Board members can view meeting minutes"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'meeting-minutes'
  AND (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(
         auth.uid(),
         'org_admin'::public.app_role,
         ((storage.foldername(name))[1])::uuid
       )
    OR EXISTS (
      SELECT 1 FROM public.board_memberships m
      WHERE m.user_id = auth.uid()
        AND m.board_id::text = (storage.foldername(name))[2]
    )
  )
);

CREATE POLICY "Board members can view special papers"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'special-papers'
  AND (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(
         auth.uid(),
         'org_admin'::public.app_role,
         ((storage.foldername(name))[1])::uuid
       )
    OR EXISTS (
      SELECT 1 FROM public.board_memberships m
      WHERE m.user_id = auth.uid()
        AND m.board_id::text = (storage.foldername(name))[2]
    )
  )
);