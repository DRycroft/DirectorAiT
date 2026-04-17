-- Phase B: COI admin review workflow
ALTER TABLE public.board_member_coi
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid;

-- Allow org admins / chairs / super_admin to update COI rows for members
-- whose board belongs to their organization. Existing self-manage policy
-- ("Members can manage their own COI") is preserved.
DROP POLICY IF EXISTS "Admins can review COI in their org" ON public.board_member_coi;
CREATE POLICY "Admins can review COI in their org"
ON public.board_member_coi
FOR UPDATE
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (
    SELECT 1
    FROM public.board_members bm
    JOIN public.boards b ON b.id = bm.board_id
    WHERE bm.id = board_member_coi.member_id
      AND (
        has_role(auth.uid(), 'org_admin'::app_role, b.org_id)
        OR has_role(auth.uid(), 'chair'::app_role, b.org_id)
      )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (
    SELECT 1
    FROM public.board_members bm
    JOIN public.boards b ON b.id = bm.board_id
    WHERE bm.id = board_member_coi.member_id
      AND (
        has_role(auth.uid(), 'org_admin'::app_role, b.org_id)
        OR has_role(auth.uid(), 'chair'::app_role, b.org_id)
      )
  )
);