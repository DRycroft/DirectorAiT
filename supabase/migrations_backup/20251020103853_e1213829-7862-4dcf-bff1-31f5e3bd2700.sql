-- Allow users to create organizations
CREATE POLICY "Users can create organizations"
ON public.organizations
FOR INSERT
WITH CHECK (true);