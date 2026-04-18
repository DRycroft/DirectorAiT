DROP POLICY IF EXISTS "Org members can upload board documents" ON storage.objects;
DROP POLICY IF EXISTS "Org members can update board documents" ON storage.objects;
DROP POLICY IF EXISTS "Owners or org admins can delete board documents" ON storage.objects;
DROP POLICY IF EXISTS "Org members can upload executive reports" ON storage.objects;
DROP POLICY IF EXISTS "Org members can update executive reports" ON storage.objects;
DROP POLICY IF EXISTS "Owners or org admins can delete executive reports" ON storage.objects;
DROP POLICY IF EXISTS "Org members can upload meeting minutes" ON storage.objects;
DROP POLICY IF EXISTS "Org members can update meeting minutes" ON storage.objects;
DROP POLICY IF EXISTS "Owners or org admins can delete meeting minutes" ON storage.objects;
DROP POLICY IF EXISTS "Org members can upload special papers" ON storage.objects;
DROP POLICY IF EXISTS "Org members can update special papers" ON storage.objects;
DROP POLICY IF EXISTS "Owners or org admins can delete special papers" ON storage.objects;

CREATE POLICY "Org members can upload board documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'board-documents'
  AND owner = auth.uid()
  AND (storage.foldername(name))[1] = (SELECT org_id::text FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Org members can update board documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'board-documents'
  AND (storage.foldername(name))[1] = (SELECT org_id::text FROM public.profiles WHERE id = auth.uid())
  AND (
    owner = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'org_admin'::public.app_role, ((storage.foldername(name))[1])::uuid)
    OR public.has_role(auth.uid(), 'chair'::public.app_role, ((storage.foldername(name))[1])::uuid)
  )
);

CREATE POLICY "Owners or org admins can delete board documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'board-documents'
  AND (storage.foldername(name))[1] = (SELECT org_id::text FROM public.profiles WHERE id = auth.uid())
  AND (
    owner = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'org_admin'::public.app_role, ((storage.foldername(name))[1])::uuid)
    OR public.has_role(auth.uid(), 'chair'::public.app_role, ((storage.foldername(name))[1])::uuid)
  )
);

CREATE POLICY "Org members can upload executive reports"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'executive-reports'
  AND owner = auth.uid()
  AND (storage.foldername(name))[1] = (SELECT org_id::text FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Org members can update executive reports"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'executive-reports'
  AND (storage.foldername(name))[1] = (SELECT org_id::text FROM public.profiles WHERE id = auth.uid())
  AND (
    owner = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'org_admin'::public.app_role, ((storage.foldername(name))[1])::uuid)
    OR public.has_role(auth.uid(), 'chair'::public.app_role, ((storage.foldername(name))[1])::uuid)
  )
);

CREATE POLICY "Owners or org admins can delete executive reports"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'executive-reports'
  AND (storage.foldername(name))[1] = (SELECT org_id::text FROM public.profiles WHERE id = auth.uid())
  AND (
    owner = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'org_admin'::public.app_role, ((storage.foldername(name))[1])::uuid)
    OR public.has_role(auth.uid(), 'chair'::public.app_role, ((storage.foldername(name))[1])::uuid)
  )
);

CREATE POLICY "Org members can upload meeting minutes"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'meeting-minutes'
  AND owner = auth.uid()
  AND (storage.foldername(name))[1] = (SELECT org_id::text FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Org members can update meeting minutes"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'meeting-minutes'
  AND (storage.foldername(name))[1] = (SELECT org_id::text FROM public.profiles WHERE id = auth.uid())
  AND (
    owner = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'org_admin'::public.app_role, ((storage.foldername(name))[1])::uuid)
    OR public.has_role(auth.uid(), 'chair'::public.app_role, ((storage.foldername(name))[1])::uuid)
  )
);

CREATE POLICY "Owners or org admins can delete meeting minutes"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'meeting-minutes'
  AND (storage.foldername(name))[1] = (SELECT org_id::text FROM public.profiles WHERE id = auth.uid())
  AND (
    owner = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'org_admin'::public.app_role, ((storage.foldername(name))[1])::uuid)
    OR public.has_role(auth.uid(), 'chair'::public.app_role, ((storage.foldername(name))[1])::uuid)
  )
);

CREATE POLICY "Org members can upload special papers"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'special-papers'
  AND owner = auth.uid()
  AND (storage.foldername(name))[1] = (SELECT org_id::text FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Org members can update special papers"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'special-papers'
  AND (storage.foldername(name))[1] = (SELECT org_id::text FROM public.profiles WHERE id = auth.uid())
  AND (
    owner = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'org_admin'::public.app_role, ((storage.foldername(name))[1])::uuid)
    OR public.has_role(auth.uid(), 'chair'::public.app_role, ((storage.foldername(name))[1])::uuid)
  )
);

CREATE POLICY "Owners or org admins can delete special papers"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'special-papers'
  AND (storage.foldername(name))[1] = (SELECT org_id::text FROM public.profiles WHERE id = auth.uid())
  AND (
    owner = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'org_admin'::public.app_role, ((storage.foldername(name))[1])::uuid)
    OR public.has_role(auth.uid(), 'chair'::public.app_role, ((storage.foldername(name))[1])::uuid)
  )
);