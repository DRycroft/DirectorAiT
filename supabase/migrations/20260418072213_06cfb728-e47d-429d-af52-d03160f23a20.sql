DROP POLICY IF EXISTS "Board members can view members in their boards" ON public.board_members;

CREATE POLICY "Board members can view active members in their boards"
ON public.board_members
FOR SELECT
TO authenticated
USING (
  (
    board_id IN (
      SELECT bm.board_id FROM public.board_memberships bm
      WHERE bm.user_id = auth.uid()
    )
    AND invite_token IS NULL
  )
  OR user_id = auth.uid()
);