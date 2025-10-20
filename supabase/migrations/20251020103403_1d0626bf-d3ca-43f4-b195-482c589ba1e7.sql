-- Add UPDATE policy for organizations table
CREATE POLICY "Users can update their organization"
ON public.organizations
FOR UPDATE
USING (
  id IN (
    SELECT org_id
    FROM public.profiles
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  id IN (
    SELECT org_id
    FROM public.profiles
    WHERE id = auth.uid()
  )
);