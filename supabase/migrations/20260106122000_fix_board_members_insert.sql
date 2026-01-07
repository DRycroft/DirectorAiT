-- Fix board_members INSERT to allow org admins to bootstrap boards

-- Remove legacy role-based insert policies if present
drop policy if exists "chairs and directors can insert board members" on board_members;
drop policy if exists "authenticated can insert board members" on board_members;

-- Org admins can insert board members for boards in their org
create policy "org admins can insert board members"
on board_members for insert
with check (
  exists (
    select 1
    from boards b
    where b.id = board_members.board_id
      and is_org_admin(b.org_id)
  )
);

-- Org admins can update board members (data entry on behalf)
create policy "org admins can update board members"
on board_members for update
using (
  exists (
    select 1
    from boards b
    where b.id = board_members.board_id
      and is_org_admin(b.org_id)
  )
);

-- Board members may still update their own record
create policy "board members can update their own record"
on board_members for update
using (
  board_members.user_id = auth.uid()
);
