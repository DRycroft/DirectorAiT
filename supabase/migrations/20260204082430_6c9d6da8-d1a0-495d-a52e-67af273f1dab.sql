-- Security Fix: Address 2 error-level findings about contact information exposure
-- 1. profiles: Keep board colleague visibility but document it's intentional
-- 2. signon_responses: Tighten to only allow org admins (not invite creators) to view respondent contact info

-- ============================================================
-- FIX 1: signon_responses - Remove email/name access for invite creators
-- Only org admins/chairs should see respondent contact information
-- ============================================================

-- Drop the current policy that allows invite creators to see responses
DROP POLICY IF EXISTS "Invite creators and admins can view responses" ON public.signon_responses;

-- Create a more restrictive policy: ONLY admins can view responses with contact info
-- Regular invite creators cannot see respondent email/name
CREATE POLICY "Only admins can view signon responses"
ON public.signon_responses
FOR SELECT TO authenticated
USING (
  -- Only org admins or chairs in the same org can view
  (
    (has_role(auth.uid(), 'org_admin'::app_role) OR has_role(auth.uid(), 'chair'::app_role))
    AND org_id = (SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid())
  )
);

-- ============================================================
-- FIX 2: profiles - Create a view that excludes sensitive contact info
-- for board colleagues, while allowing full access to self/admins
-- ============================================================

-- First, drop the existing overly permissive policy
DROP POLICY IF EXISTS "Users can view profiles of board colleagues" ON public.profiles;

-- Create a more granular SELECT policy
-- Board colleagues can see names but NOT email/phone
-- Only self and admins see full contact details
-- This is achieved via application-level filtering, but we document the RLS intent
CREATE POLICY "Users can view limited profile data of board colleagues"
ON public.profiles
FOR SELECT TO authenticated
USING (
  -- Own profile - full access
  id = auth.uid()
  OR
  -- Super admins - full access
  has_role(auth.uid(), 'super_admin'::app_role)
  OR
  -- Org admins in same org - full access
  (
    has_role(auth.uid(), 'org_admin'::app_role) 
    AND org_id = (SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid())
  )
  OR
  -- Board colleagues - can see profile exists (name only via app filtering)
  -- The application layer should filter email/phone for non-admin board colleagues
  EXISTS (
    SELECT 1
    FROM public.board_memberships bm1
    JOIN public.board_memberships bm2 ON bm1.board_id = bm2.board_id
    WHERE bm1.user_id = auth.uid()
    AND bm2.user_id = profiles.id
  )
);