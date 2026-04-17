-- 1) Tighten self-insert: drop 'owner' from the allowlist
DROP POLICY IF EXISTS "Users can self-insert non-elevated memberships" ON public.board_memberships;

CREATE POLICY "Users can self-insert non-elevated memberships"
ON public.board_memberships
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role IN ('observer','member')
);

-- 2) Bootstrap-only RPC for first-board owner creation.
--    Mirrors the invariants enforced by bootstrap_first_org_admin:
--      (a) caller has zero existing board_memberships
--      (b) target board's org matches caller's profile.org_id
--      (c) caller is the only profile on that org
--      (d) board has no existing memberships
CREATE OR REPLACE FUNCTION public.bootstrap_first_board_owner(_board_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _board_org uuid;
  _profile_org uuid;
  _existing_memberships int;
  _other_profiles int;
  _existing_board_memberships int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _board_id IS NULL THEN
    RAISE EXCEPTION 'board_id is required';
  END IF;

  -- (a) caller must have zero existing board memberships anywhere
  SELECT count(*) INTO _existing_memberships
  FROM public.board_memberships
  WHERE user_id = _uid;

  IF _existing_memberships > 0 THEN
    RAISE EXCEPTION 'Bootstrap not allowed: caller already has board memberships';
  END IF;

  -- (b) target board's org must match caller's profile org
  SELECT b.org_id INTO _board_org
  FROM public.boards b
  WHERE b.id = _board_id;

  IF _board_org IS NULL THEN
    RAISE EXCEPTION 'Board not found';
  END IF;

  SELECT org_id INTO _profile_org
  FROM public.profiles
  WHERE id = _uid;

  IF _profile_org IS DISTINCT FROM _board_org THEN
    RAISE EXCEPTION 'Bootstrap not allowed: board is not in caller''s organization';
  END IF;

  -- (c) caller must be the only profile on that org
  SELECT count(*) INTO _other_profiles
  FROM public.profiles
  WHERE org_id = _board_org
    AND id <> _uid;

  IF _other_profiles > 0 THEN
    RAISE EXCEPTION 'Bootstrap not allowed: organization already has other members';
  END IF;

  -- (d) the board must have no existing memberships at all
  SELECT count(*) INTO _existing_board_memberships
  FROM public.board_memberships
  WHERE board_id = _board_id;

  IF _existing_board_memberships > 0 THEN
    RAISE EXCEPTION 'Bootstrap not allowed: board already has memberships';
  END IF;

  -- All guards passed: insert the owner row
  INSERT INTO public.board_memberships (board_id, user_id, role, accepted_at)
  VALUES (_board_id, _uid, 'owner', now());
END;
$function$;

REVOKE ALL ON FUNCTION public.bootstrap_first_board_owner(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_board_owner(uuid) TO authenticated;