-- Root cause α fix: add org-scope to board_memberships self-insert.
-- Self-insert (observer/member) must target a board within the caller's own org.
-- Bootstrap-owner path is unaffected (uses bootstrap_first_board_owner SECURITY DEFINER RPC).
-- Admin-elevated path is unaffected (separate "Admins can insert elevated memberships" policy).

DROP POLICY IF EXISTS "Users can self-insert non-elevated memberships" ON public.board_memberships;

CREATE POLICY "Users can self-insert non-elevated memberships"
ON public.board_memberships
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role IN ('observer','member')
  AND board_id IN (
    SELECT b.id
    FROM public.boards b
    JOIN public.profiles p ON p.org_id = b.org_id
    WHERE p.id = auth.uid()
  )
);