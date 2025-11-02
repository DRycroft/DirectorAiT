-- Drop the problematic policy
DROP POLICY IF EXISTS "Org members can create boards" ON public.boards;

-- Recreate the policy with a simpler check that doesn't cause recursion
-- Since profiles SELECT policy allows users to view their own profile,
-- we can just check the org_id directly
CREATE POLICY "Org members can create boards"
ON public.boards
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.org_id = boards.org_id
  )
);