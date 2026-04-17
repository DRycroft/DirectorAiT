-- Fix 1: document_invites.token column visibility
REVOKE SELECT ON public.document_invites FROM authenticated;

GRANT SELECT
  (id, org_id, invite_type, target_type, target_id,
   recipient_email, recipient_name, status,
   expires_at, completed_at, created_by, created_at, updated_at)
ON public.document_invites TO authenticated;

-- Fix 2: templates published cross-org / anon exposure
DROP POLICY IF EXISTS "Users can view templates in their scope" ON public.templates;

CREATE POLICY "Users can view templates in their scope"
ON public.templates
FOR SELECT
TO authenticated
USING (
  author_id = auth.uid()
  OR org_id IN (
    SELECT org_id FROM public.profiles
    WHERE id = auth.uid() AND org_id IS NOT NULL
  )
);