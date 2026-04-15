-- Drop the overly broad update policy
DROP POLICY IF EXISTS "Users can update packs in their org" ON public.board_packs;

-- Replace with role-restricted update policy
CREATE POLICY "Elevated roles can update packs"
ON public.board_packs
FOR UPDATE
TO public
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    board_id IN (
      SELECT b.id FROM boards b
      WHERE b.org_id IN (
        SELECT p.org_id FROM profiles p WHERE p.id = auth.uid()
      )
    )
    AND (
      has_role(auth.uid(), 'org_admin'::app_role, (
        SELECT b.org_id FROM boards b WHERE b.id = board_packs.board_id
      ))
      OR has_role(auth.uid(), 'chair'::app_role, (
        SELECT b.org_id FROM boards b WHERE b.id = board_packs.board_id
      ))
    )
  )
);

-- Also tighten the delete policy while we're here
DROP POLICY IF EXISTS "Users can delete packs in their org" ON public.board_packs;

CREATE POLICY "Elevated roles can delete packs"
ON public.board_packs
FOR DELETE
TO public
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (
    board_id IN (
      SELECT b.id FROM boards b
      WHERE b.org_id IN (
        SELECT p.org_id FROM profiles p WHERE p.id = auth.uid()
      )
    )
    AND (
      has_role(auth.uid(), 'org_admin'::app_role, (
        SELECT b.org_id FROM boards b WHERE b.id = board_packs.board_id
      ))
      OR has_role(auth.uid(), 'chair'::app_role, (
        SELECT b.org_id FROM boards b WHERE b.id = board_packs.board_id
      ))
    )
  )
);