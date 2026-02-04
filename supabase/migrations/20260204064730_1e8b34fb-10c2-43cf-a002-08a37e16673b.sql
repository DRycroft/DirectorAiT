-- ================================================================
-- FIX 1: Profiles Table - Restrict to own profile + admins only
-- ================================================================

-- Drop the overly permissive org-wide profile view policy
DROP POLICY IF EXISTS "Users can view org profiles" ON public.profiles;

-- Create a more restrictive policy: users can only view profiles of people they share a board with
CREATE POLICY "Users can view board member profiles"
ON public.profiles
FOR SELECT
USING (
  id = auth.uid()  -- Always allow viewing own profile
  OR has_role(auth.uid(), 'org_admin')  -- Org admins can view all in org
  OR has_role(auth.uid(), 'super_admin')  -- Super admins can view all
  OR EXISTS (
    -- Allow viewing profiles of users who share at least one board membership
    SELECT 1 FROM public.board_memberships bm1
    JOIN public.board_memberships bm2 ON bm1.board_id = bm2.board_id
    WHERE bm1.user_id = auth.uid()
    AND bm2.user_id = profiles.id
  )
);

-- ================================================================
-- FIX 2: Board Members Sensitive - Restrict to self + direct board admins
-- ================================================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Only admins or self can view sensitive data" ON public.board_members_sensitive;
DROP POLICY IF EXISTS "Only admins or self can insert sensitive data" ON public.board_members_sensitive;
DROP POLICY IF EXISTS "Only admins or self can update sensitive data" ON public.board_members_sensitive;
DROP POLICY IF EXISTS "Only admins can delete sensitive data" ON public.board_members_sensitive;

-- Create helper function to check if user is admin/chair of the specific board the member belongs to
CREATE OR REPLACE FUNCTION public.is_board_admin_for_member(_user_id uuid, _member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.board_members bm
    JOIN public.board_memberships bms ON bms.board_id = bm.board_id
    WHERE bm.id = _member_id
    AND bms.user_id = _user_id
    AND bms.role IN ('chair', 'admin')
  )
$$;

-- SELECT: Only member themselves OR admin/chair of THAT specific board
CREATE POLICY "Self or board admins can view sensitive data"
ON public.board_members_sensitive
FOR SELECT
USING (
  -- The member themselves (via their linked board_member record)
  member_id IN (
    SELECT id FROM public.board_members WHERE user_id = auth.uid()
  )
  -- OR user is admin/chair of the specific board this member belongs to
  OR public.is_board_admin_for_member(auth.uid(), member_id)
);

-- INSERT: Only member themselves OR admin/chair of that specific board
CREATE POLICY "Self or board admins can insert sensitive data"
ON public.board_members_sensitive
FOR INSERT
WITH CHECK (
  member_id IN (
    SELECT id FROM public.board_members WHERE user_id = auth.uid()
  )
  OR public.is_board_admin_for_member(auth.uid(), member_id)
);

-- UPDATE: Only member themselves OR admin/chair of that specific board
CREATE POLICY "Self or board admins can update sensitive data"
ON public.board_members_sensitive
FOR UPDATE
USING (
  member_id IN (
    SELECT id FROM public.board_members WHERE user_id = auth.uid()
  )
  OR public.is_board_admin_for_member(auth.uid(), member_id)
);

-- DELETE: Only admin/chair of that specific board (not the member themselves)
CREATE POLICY "Board admins can delete sensitive data"
ON public.board_members_sensitive
FOR DELETE
USING (
  public.is_board_admin_for_member(auth.uid(), member_id)
);