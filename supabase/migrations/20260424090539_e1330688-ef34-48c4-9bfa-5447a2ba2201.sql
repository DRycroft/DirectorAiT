CREATE OR REPLACE FUNCTION public.generate_member_invite_token(_board_id uuid DEFAULT NULL::uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _caller_org_id uuid;
BEGIN
  SELECT org_id INTO _caller_org_id
  FROM public.profiles
  WHERE id = auth.uid();

  IF _board_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.board_memberships
      WHERE board_id = _board_id
      AND user_id = auth.uid()
      AND role IN ('chair', 'admin', 'owner')
    ) AND NOT public.has_role(auth.uid(), 'org_admin', _caller_org_id)
      AND NOT public.has_role(auth.uid(), 'chair', _caller_org_id)
      AND NOT public.has_role(auth.uid(), 'super_admin') THEN
      RAISE EXCEPTION 'Unauthorized: Only board admins can generate invite tokens';
    END IF;
  END IF;

  RETURN encode(extensions.gen_random_bytes(32), 'base64');
END;
$function$;