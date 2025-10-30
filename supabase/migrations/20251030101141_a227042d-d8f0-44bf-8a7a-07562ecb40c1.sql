-- Drop current INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create boards" ON public.boards;

-- Create INSERT policy matching the pattern of other policies (INSERT only uses WITH CHECK)
CREATE POLICY "Authenticated users can create boards" 
ON public.boards 
FOR INSERT 
TO public
WITH CHECK (auth.uid() IS NOT NULL);