-- Align core RLS to org_admins authority model

-- 1) BOARDS
-- Org admins can create boards in their org
drop policy if exists "authenticated can insert boards" on boards;
drop policy if exists "org admins can insert boards" on boards;

create policy "org admins can insert boards"
on boards for insert
with check (
  is_org_admin(org_id)
);

-- Org admins can fully manage boards in their org
drop policy if exists "org admins can update boards" on boards;
drop policy if exists "org admins can delete boards" on boards;

create policy "org admins can update boards"
on boards for update
using (is_org_admin(org_id));

create policy "org admins can delete boards"
on boards for delete
using (is_org_admin(org_id));


-- 2) BOARD MEMBERSHIPS
-- Org admins can create board memberships to bootstrap boards
drop policy if exists "org admins can insert board memberships" on board_memberships;

create policy "org admins can insert board memberships"
on board_memberships for insert
with check (
  exists (
    select 1
    from boards b
    where b.id = board_memberships.board_id
      and is_org_admin(b.org_id)
  )
);

-- Org admins can manage memberships
drop policy if exists "org admins can update board memberships" on board_memberships;
drop policy if exists "org admins can delete board memberships" on board_memberships;

create policy "org admins can update board memberships"
on board_memberships for update
using (
  exists (
    select 1
    from boards b
    where b.id = board_memberships.board_id
      and is_org_admin(b.org_id)
  )
);

create policy "org admins can delete board memberships"
on board_memberships for delete
using (
  exists (
    select 1
    from boards b
    where b.id = board_memberships.board_id
      and is_org_admin(b.org_id)
  )
);
