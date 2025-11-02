-- Drop and recreate INSERT policy for organizations
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;

-- Allow authenticated users to create organizations
CREATE POLICY "Users can insert organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);