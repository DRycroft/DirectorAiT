-- Grant INSERT privilege to authenticated users on boards table
GRANT INSERT ON public.boards TO authenticated;

-- Verify the RLS policy is correctly set up
DROP POLICY IF EXISTS "Org members can create boards" ON public.boards;

CREATE POLICY "Org members can create boards"
ON public.boards
FOR INSERT
TO authenticated
WITH CHECK (
  org_id = public.get_user_org_id(auth.uid())
);