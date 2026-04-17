-- Role-gate UPDATE and DELETE on public.boards.
-- Previously any user whose profiles.org_id matched the board's org could update/delete.
-- Now restricted to super_admin, org_admin (for org), or chair (for org).

DROP POLICY IF EXISTS "Org members can delete boards" ON public.boards;
DROP POLICY IF EXISTS "Org members can update boards" ON public.boards;

CREATE POLICY "Admins can delete boards"
ON public.boards
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'org_admin'::app_role, org_id)
  OR has_role(auth.uid(), 'chair'::app_role, org_id)
);

CREATE POLICY "Admins can update boards"
ON public.boards
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'org_admin'::app_role, org_id)
  OR has_role(auth.uid(), 'chair'::app_role, org_id)
);