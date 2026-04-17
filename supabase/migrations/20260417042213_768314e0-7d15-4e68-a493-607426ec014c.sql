-- 1) Replace incorrect role allowlist with the values actually used by the app
ALTER TABLE public.board_memberships
  DROP CONSTRAINT board_memberships_role_check;

ALTER TABLE public.board_memberships
  ADD CONSTRAINT board_memberships_role_check
  CHECK (role IN ('observer','member','owner','admin','chair'));

-- 2) Replace overly-permissive self-insert policy
DROP POLICY IF EXISTS "Users can insert their own memberships" ON public.board_memberships;

CREATE POLICY "Users can self-insert non-elevated memberships"
ON public.board_memberships
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role IN ('observer','member','owner')
);

-- 3) Admin-gated insert path for elevated roles ('chair','admin')
CREATE POLICY "Admins can insert elevated memberships"
ON public.board_memberships
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.boards b
    WHERE b.id = board_memberships.board_id
      AND (
        has_role(auth.uid(), 'org_admin'::app_role, b.org_id)
        OR has_role(auth.uid(), 'chair'::app_role, b.org_id)
      )
  )
);