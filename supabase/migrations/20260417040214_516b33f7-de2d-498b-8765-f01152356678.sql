-- Phase 1 containment: stop ordinary board members from reading invite secrets
-- by revoking column-level SELECT on the four invite columns. INSERT/UPDATE
-- privileges on these columns are intentionally preserved so admin write
-- paths (create/resend/revoke) and the invite-acceptance clear-token path
-- continue to work unchanged.

REVOKE SELECT (invite_token, invite_email, invite_expires_at, invite_sent_at)
  ON public.board_members FROM authenticated;

REVOKE SELECT (invite_token, invite_email, invite_expires_at, invite_sent_at)
  ON public.board_members FROM anon;

-- Definer RPC #1: invite-acceptance lookup by token.
-- The token itself is the bearer secret, so possessing it authorises the
-- read. Returns only the fields AcceptInvite.tsx needs and only when the
-- invite is still valid.
CREATE OR REPLACE FUNCTION public.lookup_invite_by_token(_token text)
RETURNS TABLE (
  id uuid,
  full_name text,
  public_contact_email text,
  invite_email text,
  invite_expires_at timestamptz,
  board_id uuid,
  board_title text,
  org_id uuid,
  org_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    bm.id,
    bm.full_name,
    bm.public_contact_email,
    bm.invite_email,
    bm.invite_expires_at,
    bm.board_id,
    b.title       AS board_title,
    b.org_id      AS org_id,
    o.name        AS org_name
  FROM public.board_members bm
  JOIN public.boards b        ON b.id = bm.board_id
  JOIN public.organizations o ON o.id = b.org_id
  WHERE bm.invite_token = _token
    AND bm.status = 'invited'
    AND (bm.invite_expires_at IS NULL OR bm.invite_expires_at > now())
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_invite_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_invite_by_token(text) TO anon, authenticated;

-- Definer RPC #1b: detect that a token exists but is expired, so the UI
-- can show a useful "expired" message without leaking other fields.
CREATE OR REPLACE FUNCTION public.invite_token_exists(_token text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.board_members
    WHERE invite_token = _token AND status = 'invited'
  );
$$;

REVOKE ALL ON FUNCTION public.invite_token_exists(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invite_token_exists(text) TO anon, authenticated;

-- Definer RPC #2: admin-only read of invite_email for resend / duplicate-check.
-- Authorisation: super_admin, or org_admin/chair of the board's org, or
-- chair/admin/owner of the board itself.
CREATE OR REPLACE FUNCTION public.get_member_invite_email(_member_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id uuid;
  _email  text;
BEGIN
  SELECT b.org_id, bm.invite_email
    INTO _org_id, _email
  FROM public.board_members bm
  JOIN public.boards b ON b.id = bm.board_id
  WHERE bm.id = _member_id;

  IF _org_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'org_admin'::public.app_role, _org_id)
    OR public.has_role(auth.uid(), 'chair'::public.app_role, _org_id)
    OR public.is_board_admin_for_member(auth.uid(), _member_id)
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN _email;
END;
$$;

REVOKE ALL ON FUNCTION public.get_member_invite_email(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_member_invite_email(uuid) TO authenticated;

-- Definer RPC #3: admin-only duplicate-invite check used by BoardManagement
-- when creating a new invite (it currently filters board_members by
-- invite_email, which will no longer return rows for non-admin readers but
-- ALSO will silently return zero rows for admin readers since the column
-- predicate is evaluated against a now-unreadable column for the
-- authenticated role at the planner layer in some clients). Provide a
-- definer helper that returns whether an active/pending invite already
-- exists for a given email on a given board.
CREATE OR REPLACE FUNCTION public.invite_exists_for_email(_board_id uuid, _email text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id uuid;
BEGIN
  SELECT org_id INTO _org_id FROM public.boards WHERE id = _board_id;
  IF _org_id IS NULL THEN
    RAISE EXCEPTION 'Board not found';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR public.has_role(auth.uid(), 'org_admin'::public.app_role, _org_id)
    OR public.has_role(auth.uid(), 'chair'::public.app_role, _org_id)
    OR EXISTS (
      SELECT 1 FROM public.board_memberships
      WHERE board_id = _board_id
        AND user_id = auth.uid()
        AND role IN ('chair','admin','owner')
    )
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.board_members
    WHERE board_id = _board_id
      AND lower(invite_email) = lower(_email)
      AND status IN ('invited','active')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.invite_exists_for_email(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invite_exists_for_email(uuid, text) TO authenticated;