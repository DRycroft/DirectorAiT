-- Patch existing org_admins table to support primary admin concept

-- 1) Add column if missing
alter table org_admins
add column if not exists is_primary boolean not null default false;

-- 2) Ensure exactly one primary admin per org
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'org_admins_one_primary_per_org'
  ) then
    alter table org_admins
      add constraint org_admins_one_primary_per_org
      unique (org_id, is_primary)
      deferrable initially deferred;
  end if;
end;
$$;
