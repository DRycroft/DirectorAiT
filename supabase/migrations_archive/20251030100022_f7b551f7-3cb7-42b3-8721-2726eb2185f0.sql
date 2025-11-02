-- Create a security definer function to check org membership
CREATE OR REPLACE FUNCTION public.user_can_create_in_org(check_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND org_id = check_org_id
    AND org_id IS NOT NULL
  );
$$;

-- Drop and recreate the INSERT policy using the function
DROP POLICY IF EXISTS "Org members can create boards" ON public.boards;

CREATE POLICY "Org members can create boards" 
ON public.boards 
FOR INSERT 
TO authenticated
WITH CHECK (
  public.user_can_create_in_org(org_id)
);