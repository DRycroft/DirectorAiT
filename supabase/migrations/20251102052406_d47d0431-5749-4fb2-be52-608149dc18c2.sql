-- Fix organizations RLS policy to allow signup
-- Drop all existing INSERT policies on organizations
DROP POLICY IF EXISTS "Authenticated users can create first org" ON public.organizations;
DROP POLICY IF EXISTS "Restrict org creation to users without org" ON public.organizations;
DROP POLICY IF EXISTS "Users can insert organizations" ON public.organizations;

-- Create a simple policy that allows authenticated users to create orgs
CREATE POLICY "Authenticated users can create organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);