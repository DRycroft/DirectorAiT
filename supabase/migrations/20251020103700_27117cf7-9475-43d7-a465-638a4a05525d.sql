-- Fix infinite recursion by using security definer function
-- Drop all conflicting policies on profiles
DROP POLICY IF EXISTS "Users can view profiles in same org" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their org" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- We already have get_user_org_id function, so let's use it
-- Create clean, non-recursive policies

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (id = auth.uid());

-- Users can view profiles in their organization (using security definer function)
CREATE POLICY "Users can view org profiles"
ON public.profiles
FOR SELECT
USING (
  org_id IS NOT NULL 
  AND org_id = public.get_user_org_id(auth.uid())
);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());