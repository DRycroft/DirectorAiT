-- Fix RLS policies for board_members table
-- Allow board members with appropriate access to insert new members

-- Drop the existing "Admins can manage board members" policy if it exists
-- and recreate with better granularity

-- First, drop the old "Admins can manage board members" policy
DROP POLICY IF EXISTS "Admins can manage board members" ON public.board_members;

-- Create separate policies for INSERT, UPDATE, and DELETE with proper checks

-- INSERT: Allow org_admins, chairs, and board members to add new members to their boards
CREATE POLICY "Board members can insert members in their boards"
  ON public.board_members FOR INSERT
  WITH CHECK (
    -- User must be a member of the board they're adding to
    board_id IN (
      SELECT board_id FROM public.board_memberships 
      WHERE user_id = auth.uid()
    )
    OR
    -- OR user is an admin/chair
    has_role(auth.uid(), 'org_admin'::app_role) OR 
    has_role(auth.uid(), 'chair'::app_role)
  );

-- UPDATE: Admins and chairs can update any member, or members can update their own profile
CREATE POLICY "Admins and chairs can update board members"
  ON public.board_members FOR UPDATE
  USING (
    has_role(auth.uid(), 'org_admin'::app_role) OR 
    has_role(auth.uid(), 'chair'::app_role) OR
    user_id = auth.uid()
  )
  WITH CHECK (
    has_role(auth.uid(), 'org_admin'::app_role) OR 
    has_role(auth.uid(), 'chair'::app_role) OR
    user_id = auth.uid()
  );

-- DELETE: Only admins and chairs can delete members
CREATE POLICY "Admins and chairs can delete board members"
  ON public.board_members FOR DELETE
  USING (
    has_role(auth.uid(), 'org_admin'::app_role) OR 
    has_role(auth.uid(), 'chair'::app_role)
  );
