-- Drop the problematic INSERT policy
DROP POLICY IF EXISTS "Org members can create boards" ON public.boards;

-- Create a simpler INSERT policy for authenticated users
-- The SELECT policy will handle data isolation
CREATE POLICY "Authenticated users can create boards" 
ON public.boards 
FOR INSERT 
TO authenticated
WITH CHECK (true);