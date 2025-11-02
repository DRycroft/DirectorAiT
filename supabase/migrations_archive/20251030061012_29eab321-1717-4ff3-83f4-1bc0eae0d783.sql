-- Drop existing INSERT policy and recreate with proper permissions
DROP POLICY IF EXISTS "Org members can create boards" ON public.boards;

-- Allow authenticated users to create boards in their organization
CREATE POLICY "Org members can create boards"
ON public.boards
FOR INSERT
TO authenticated
WITH CHECK (
  org_id IN (
    SELECT org_id 
    FROM public.profiles 
    WHERE id = auth.uid() 
    AND org_id IS NOT NULL
  )
);