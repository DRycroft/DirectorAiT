-- Fix bootstrap deadlock when inserting first board member

-- Drop existing INSERT policy
drop policy if exists "Board members can insert members in their boards"
on public.board_members;

-- Recreate INSERT policy with safe bootstrap rule
create policy "Board members can insert members in their boards"
on public.board_members
for insert
to authenticated
with check (
  -- Existing rule: user is already a member of the board
  board_id in (
    select board_memberships.board_id
    from public.board_memberships
    where board_memberships.user_id = auth.uid()
  )

  -- Existing rule: org-level authority
  or has_role(auth.uid(), 'org_admin'::app_role)
  or has_role(auth.uid(), 'chair'::app_role)

  -- NEW: bootstrap rule (user inserting themselves)
  or user_id = auth.uid()
);
