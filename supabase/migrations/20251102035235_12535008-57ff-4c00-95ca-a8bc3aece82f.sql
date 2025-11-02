-- Fix user_roles policy to allow initial role assignment during signup
-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Only admins can assign roles" ON public.user_roles;

-- Create new policy that allows:
-- 1. Admins to assign any roles
-- 2. New users to assign themselves org_admin role if they just created an org
CREATE POLICY "Allow role assignment"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Admins can assign any role
  (has_role(auth.uid(), 'org_admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  OR
  -- New users can assign themselves org_admin if:
  -- - They're assigning to themselves
  -- - They don't have any roles yet
  -- - They have an org_id (meaning they just created an org)
  (
    user_id = auth.uid()
    AND role = 'org_admin'::app_role
    AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND org_id IS NOT NULL)
  )
);