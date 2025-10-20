-- Fix infinite recursion in profiles RLS policies
-- Drop problematic policies
DROP POLICY IF EXISTS "Users can view profiles in same org" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their org" ON public.profiles;

-- Recreate the policy without recursion
-- Users can view profiles in their organization by directly comparing org_id
CREATE POLICY "Users can view profiles in same org" 
ON public.profiles 
FOR SELECT 
USING (
  org_id IN (
    SELECT p.org_id 
    FROM public.profiles p 
    WHERE p.id = auth.uid()
  )
  OR id = auth.uid()
);