CREATE OR REPLACE FUNCTION public.bootstrap_user_workspace(
  _company_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid := auth.uid();
  v_email      text;
  v_name       text;
  v_phone      text;
  v_org_name   text;
  v_org_id     uuid;
  v_board_id   uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT org_id INTO v_org_id FROM public.profiles WHERE id = v_user_id;
  IF v_org_id IS NOT NULL THEN
    RETURN v_org_id;
  END IF;

  IF EXISTS (SELECT 1 FROM public.board_memberships WHERE user_id = v_user_id) THEN
    RAISE EXCEPTION 'already_has_memberships' USING ERRCODE = '42501';
  END IF;

  SELECT
    u.email,
    COALESCE(NULLIF(u.raw_user_meta_data->>'name',''), split_part(u.email,'@',1), 'User'),
    NULLIF(u.raw_user_meta_data->>'phone','')
  INTO v_email, v_name, v_phone
  FROM auth.users u WHERE u.id = v_user_id;

  v_org_name := COALESCE(NULLIF(trim(_company_name),''), 'My Organization');

  INSERT INTO public.organizations (name, primary_contact_name, primary_contact_email, primary_contact_phone)
  VALUES (v_org_name, v_name, v_email, v_phone)
  RETURNING id INTO v_org_id;

  INSERT INTO public.boards (org_id, title, board_type, status)
  VALUES (v_org_id, 'Main Board', 'board', 'active')
  RETURNING id INTO v_board_id;

  INSERT INTO public.profiles (id, email, name, org_id, phone)
  VALUES (v_user_id, v_email, v_name, v_org_id, v_phone)
  ON CONFLICT (id) DO UPDATE
    SET org_id = EXCLUDED.org_id,
        name   = COALESCE(public.profiles.name, EXCLUDED.name),
        phone  = COALESCE(public.profiles.phone, EXCLUDED.phone);

  INSERT INTO public.board_memberships (board_id, user_id, role, accepted_at)
  VALUES (v_board_id, v_user_id, 'owner', now())
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_roles (user_id, role, org_id)
  VALUES (v_user_id, 'org_admin', v_org_id)
  ON CONFLICT DO NOTHING;

  RETURN v_org_id;
END;
$$;

REVOKE ALL ON FUNCTION public.bootstrap_user_workspace(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bootstrap_user_workspace(text) TO authenticated;