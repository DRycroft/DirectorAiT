-- Fix organization creation by using a security definer function
-- This prevents RLS recursion issues during signup

CREATE OR REPLACE FUNCTION public.user_can_create_org()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND org_id IS NOT NULL
  );
$$;

-- Drop and recreate the organization INSERT policy
DROP POLICY IF EXISTS "Restrict org creation to users without org" ON public.organizations;
DROP POLICY IF EXISTS "Users can insert organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;

-- Create new policy using the security definer function
CREATE POLICY "Authenticated users can create first org"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (
  public.user_can_create_org()
);