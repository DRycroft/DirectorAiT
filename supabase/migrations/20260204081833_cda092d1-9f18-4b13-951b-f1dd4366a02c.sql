-- Security Fix: Address 3 error-level RLS policy vulnerabilities
-- 1. profiles: Restrict access to board members user works with
-- 2. signon_responses: Restrict to invite creators and admins only
-- 3. organizations: Restrict UPDATE to org admins only

-- ============================================================
-- FIX 1: profiles table - Restrict email/phone exposure
-- ============================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view board member profiles" ON public.profiles;

-- Create a more restrictive policy that only allows viewing profiles of:
-- 1. Own profile
-- 2. Users who share a board membership
-- 3. Admins can view all in their org
CREATE POLICY "Users can view profiles of board colleagues"
ON public.profiles
FOR SELECT TO authenticated
USING (
  -- Own profile
  id = auth.uid()
  OR
  -- Admins can view all profiles in their org
  (
    has_role(auth.uid(), 'org_admin'::app_role) 
    AND org_id = (SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid())
  )
  OR
  has_role(auth.uid(), 'super_admin'::app_role)
  OR
  -- Users who share at least one board membership
  EXISTS (
    SELECT 1
    FROM public.board_memberships bm1
    JOIN public.board_memberships bm2 ON bm1.board_id = bm2.board_id
    WHERE bm1.user_id = auth.uid()
    AND bm2.user_id = profiles.id
  )
);

-- ============================================================
-- FIX 2: signon_responses - Restrict to invite creator/admins
-- ============================================================

-- Drop the current overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view responses in their org" ON public.signon_responses;

-- Create restrictive policy: only invite creator or admins can view
CREATE POLICY "Invite creators and admins can view responses"
ON public.signon_responses
FOR SELECT TO authenticated
USING (
  -- Admins can view all responses in their org
  (
    (has_role(auth.uid(), 'org_admin'::app_role) OR has_role(auth.uid(), 'chair'::app_role))
    AND org_id = (SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid())
  )
  OR
  -- User who created the related invite can view responses
  EXISTS (
    SELECT 1
    FROM public.document_invites di
    WHERE di.id = signon_responses.invite_id
    AND di.created_by = auth.uid()
  )
);

-- ============================================================
-- FIX 3: organizations - Restrict UPDATE to admins only
-- ============================================================

-- Drop the current overly permissive UPDATE policy
DROP POLICY IF EXISTS "Users can update their organization" ON public.organizations;

-- Create restrictive policy: only org admins can update
CREATE POLICY "Only org admins can update organization"
ON public.organizations
FOR UPDATE TO authenticated
USING (
  -- Must be in the org
  id = (SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid())
  AND
  -- Must have org_admin or chair role
  (has_role(auth.uid(), 'org_admin'::app_role) OR has_role(auth.uid(), 'chair'::app_role))
)
WITH CHECK (
  id = (SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid())
  AND
  (has_role(auth.uid(), 'org_admin'::app_role) OR has_role(auth.uid(), 'chair'::app_role))
);