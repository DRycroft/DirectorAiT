-- 1) Replace the over-permissive INSERT policy on public.user_roles
DROP POLICY IF EXISTS "Scoped role assignment" ON public.user_roles;

CREATE POLICY "Scoped role assignment"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Super admins can grant any role
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR
  -- Existing org_admins can grant non-super_admin roles within their org
  (
    org_id IS NOT NULL
    AND public.has_role(auth.uid(), 'org_admin'::public.app_role, org_id)
    AND role <> 'super_admin'::public.app_role
  )
  OR
  -- Self-insert of observer role, scoped to the user's own current org
  -- (used by invite-acceptance flow). No self-grant of org_admin here.
  (
    user_id = auth.uid()
    AND role = 'observer'::public.app_role
    AND org_id IS NOT NULL
    AND org_id = (SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid())
  )
);

-- 2) SECURITY DEFINER bootstrap RPC for the legitimate first-org-admin grant.
--    Strict guards prevent cross-tenant escalation:
--      a) caller must currently have ZERO rows in user_roles
--      b) caller's profile must already point at _org_id
--      c) the target org must have NO other profiles linked to it (i.e. caller is the sole member)
--      d) the target org must have NO existing user_roles rows (no prior admin)
CREATE OR REPLACE FUNCTION public.bootstrap_first_org_admin(_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _profile_org uuid;
  _other_profiles int;
  _existing_roles_for_user int;
  _existing_roles_for_org int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _org_id IS NULL THEN
    RAISE EXCEPTION 'org_id is required';
  END IF;

  -- (a) caller must have no existing roles anywhere
  SELECT count(*) INTO _existing_roles_for_user
  FROM public.user_roles
  WHERE user_id = _uid;

  IF _existing_roles_for_user > 0 THEN
    RAISE EXCEPTION 'Bootstrap not allowed: caller already has roles';
  END IF;

  -- (b) caller's profile must already be linked to this org
  SELECT org_id INTO _profile_org
  FROM public.profiles
  WHERE id = _uid;

  IF _profile_org IS DISTINCT FROM _org_id THEN
    RAISE EXCEPTION 'Bootstrap not allowed: profile is not linked to this org';
  END IF;

  -- (c) caller must be the only profile pointing at this org
  SELECT count(*) INTO _other_profiles
  FROM public.profiles
  WHERE org_id = _org_id
    AND id <> _uid;

  IF _other_profiles > 0 THEN
    RAISE EXCEPTION 'Bootstrap not allowed: organization already has other members';
  END IF;

  -- (d) the org must have no existing role assignments at all
  SELECT count(*) INTO _existing_roles_for_org
  FROM public.user_roles
  WHERE org_id = _org_id;

  IF _existing_roles_for_org > 0 THEN
    RAISE EXCEPTION 'Bootstrap not allowed: organization already has role assignments';
  END IF;

  -- All guards passed: grant org_admin to the caller.
  INSERT INTO public.user_roles (user_id, role, org_id)
  VALUES (_uid, 'org_admin'::public.app_role, _org_id)
  ON CONFLICT DO NOTHING;
END;
$$;

-- Lock down execution to authenticated callers only.
REVOKE ALL ON FUNCTION public.bootstrap_first_org_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_org_admin(uuid) TO authenticated;