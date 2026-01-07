-- 1) Org Admins (system authority, org-scoped)
create table if not exists org_admins (
  org_id uuid not null references organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_primary boolean not null default false,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id),

  constraint org_admins_pk primary key (org_id, user_id),
  constraint org_admins_one_primary_per_org unique (org_id, is_primary)
    deferrable initially deferred
);

alter table org_admins enable row level security;

-- 2) Helper: is admin of org
create or replace function is_org_admin(p_org_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from org_admins oa
    where oa.org_id = p_org_id
      and oa.user_id = auth.uid()
  );
$$;

-- 3) Bootstrap RPC: create org + make caller primary admin
create or replace function bootstrap_create_org_and_admin(
  p_org_name text
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_org_id uuid;
begin
  -- Safety: user must not already belong to an org
  if exists (select 1 from profiles where id = auth.uid() and org_id is not null) then
    raise exception 'User already belongs to an organisation';
  end if;

  insert into organisations(name)
  values (p_org_name)
  returning id into v_org_id;

  update profiles
    set org_id = v_org_id
  where id = auth.uid();

  insert into org_admins (org_id, user_id, is_primary)
  values (v_org_id, auth.uid(), true);

  return v_org_id;
end;
$$;

-- 4) RLS: org_admins visibility & mutation
create policy "admins can view org admins"
on org_admins for select
using (is_org_admin(org_id));

create policy "primary admin can grant admin"
on org_admins for insert
with check (
  exists (
    select 1 from org_admins oa
    where oa.org_id = org_admins.org_id
      and oa.user_id = auth.uid()
      and oa.is_primary = true
  )
);

create policy "primary admin can revoke admin (but not last one)"
on org_admins for delete
using (
  exists (
    select 1 from org_admins oa
    where oa.org_id = org_admins.org_id
      and oa.user_id = auth.uid()
      and oa.is_primary = true
  )
  and (
    select count(*) from org_admins oa2
    where oa2.org_id = org_admins.org_id
  ) > 1
);
