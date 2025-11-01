-- Drop the problematic policy
DROP POLICY IF EXISTS "Org members can create boards" ON public.boards;

-- Use the existing security definer function to avoid RLS recursion
CREATE POLICY "Org members can create boards"
ON public.boards
FOR INSERT
TO authenticated
WITH CHECK (
  public.get_user_org_id(auth.uid()) = org_id
);