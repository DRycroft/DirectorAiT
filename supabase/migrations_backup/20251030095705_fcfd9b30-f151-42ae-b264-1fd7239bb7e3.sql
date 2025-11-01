-- Drop existing INSERT policy for boards
DROP POLICY IF EXISTS "Org members can create boards" ON public.boards;

-- Create new INSERT policy with direct check
CREATE POLICY "Org members can create boards" 
ON public.boards 
FOR INSERT 
WITH CHECK (
  org_id IN (
    SELECT org_id 
    FROM public.profiles 
    WHERE id = auth.uid() 
    AND org_id IS NOT NULL
  )
);