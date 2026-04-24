-- 1) document_snapshots: restrict INSERT to service role only
-- (process-document edge function uses service role; no client inserts exist)
DROP POLICY IF EXISTS "Authenticated users can create snapshots" ON public.document_snapshots;

CREATE POLICY "Service role can create snapshots"
ON public.document_snapshots
FOR INSERT
TO service_role
WITH CHECK (true);

-- 2) Remove dead storage policies that use the two-arg has_role() form
-- for org_admin/chair (which always returns false). Each bucket has a working
-- replacement using the three-arg has_role() form, so effective access is
-- unchanged.
DROP POLICY IF EXISTS "Org members can delete board documents" ON storage.objects;
DROP POLICY IF EXISTS "Org members can update board documents" ON storage.objects;
DROP POLICY IF EXISTS "Org members can update executive reports" ON storage.objects;
DROP POLICY IF EXISTS "Org members can update meeting minutes" ON storage.objects;
DROP POLICY IF EXISTS "Org members can update special papers" ON storage.objects;