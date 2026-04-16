-- ============================================================
-- 1. Fix user_roles: remove duplicate policies, tighten INSERT
-- ============================================================

-- Remove duplicate SELECT policies (keep "Users can view own roles" + one admin policy)
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Org admins can view org roles" ON public.user_roles;

-- Create single admin SELECT policy
CREATE POLICY "Admins can view org roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'org_admin'::app_role, org_id)
);

-- Remove duplicate DELETE policies
DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Org admins can delete org roles" ON public.user_roles;

-- Create single DELETE policy
CREATE POLICY "Admins can delete org roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'org_admin'::app_role, org_id)
);

-- Remove duplicate UPDATE policies
DROP POLICY IF EXISTS "Only admins can modify roles" ON public.user_roles;
DROP POLICY IF EXISTS "Org admins can update org roles" ON public.user_roles;

-- Create single UPDATE policy
CREATE POLICY "Admins can update org roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'org_admin'::app_role, org_id)
);

-- Remove duplicate INSERT policies
DROP POLICY IF EXISTS "Allow role assignment" ON public.user_roles;
DROP POLICY IF EXISTS "Org admins can insert org roles" ON public.user_roles;

-- Create single INSERT policy with org-scoped admin check
CREATE POLICY "Scoped role assignment"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (
  -- Super admins can assign any role
  has_role(auth.uid(), 'super_admin'::app_role)
  OR
  -- Org admins can assign roles ONLY within their own org
  (
    org_id IS NOT NULL
    AND has_role(auth.uid(), 'org_admin'::app_role, org_id)
    AND role <> 'super_admin'::app_role
  )
  OR
  -- First-time bootstrap: user assigns themselves org_admin
  (
    user_id = auth.uid()
    AND role = 'org_admin'::app_role
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles existing
      WHERE existing.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.org_id IS NOT NULL
    )
  )
  OR
  -- Invite acceptance: user assigns themselves observer in their org
  (
    user_id = auth.uid()
    AND role = 'observer'::app_role
    AND org_id IS NOT NULL
    AND org_id = (SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid())
  )
);

-- ============================================================
-- 2. Fix boards INSERT: restrict to user's own org
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can create boards" ON public.boards;

CREATE POLICY "Users can create boards in their org"
ON public.boards FOR INSERT
TO authenticated
WITH CHECK (
  user_can_create_in_org(org_id)
);