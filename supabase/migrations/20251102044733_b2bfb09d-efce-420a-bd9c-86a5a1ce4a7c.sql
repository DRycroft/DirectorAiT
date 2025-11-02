-- Fix circular dependency in user_roles RLS policy for signup flow
-- The current policy uses has_role() which creates recursion issues during signup

-- Drop the problematic INSERT policy
DROP POLICY IF EXISTS "Allow role assignment" ON public.user_roles;

-- Create a new policy that allows self-assignment of first org_admin role
-- without circular dependency
CREATE POLICY "Allow role assignment" ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Admins can assign any role (but we check WITHOUT using has_role to avoid recursion)
  EXISTS (
    SELECT 1 FROM public.user_roles existing_roles
    WHERE existing_roles.user_id = auth.uid()
    AND existing_roles.role IN ('org_admin', 'super_admin')
  )
  OR
  -- First-time org_admin self-assignment during signup
  (
    user_id = auth.uid() 
    AND role = 'org_admin'
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles existing_roles
      WHERE existing_roles.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.org_id IS NOT NULL
    )
  )
);