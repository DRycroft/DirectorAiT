-- Update the SELECT policy to allow users to view all boards in their org
DROP POLICY IF EXISTS "Users can view boards they are members of" ON public.boards;

CREATE POLICY "Users can view boards in their org" 
ON public.boards 
FOR SELECT 
TO public
USING (
  org_id IN (
    SELECT org_id 
    FROM public.profiles 
    WHERE id = auth.uid() 
    AND org_id IS NOT NULL
  )
);