
-- Finalise a board pack (role-restricted)
CREATE OR REPLACE FUNCTION public.finalise_board_pack(_pack_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _board_org_id uuid;
BEGIN
  -- Get the org that owns this pack's board
  SELECT b.org_id INTO _board_org_id
  FROM board_packs bp
  JOIN boards b ON b.id = bp.board_id
  WHERE bp.id = _pack_id;

  IF _board_org_id IS NULL THEN
    RAISE EXCEPTION 'Pack not found';
  END IF;

  -- Check caller has an elevated role
  IF NOT (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'org_admin'::app_role, _board_org_id)
    OR has_role(auth.uid(), 'chair'::app_role, _board_org_id)
  ) THEN
    RAISE EXCEPTION 'Unauthorized: only administrators or chairs can finalise a pack';
  END IF;

  UPDATE board_packs
  SET status = 'finalised',
      finalised_at = now(),
      finalised_by = auth.uid()
  WHERE id = _pack_id;
END;
$$;

-- Unlock a finalised board pack (role-restricted)
CREATE OR REPLACE FUNCTION public.unlock_board_pack(_pack_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _board_org_id uuid;
BEGIN
  SELECT b.org_id INTO _board_org_id
  FROM board_packs bp
  JOIN boards b ON b.id = bp.board_id
  WHERE bp.id = _pack_id;

  IF _board_org_id IS NULL THEN
    RAISE EXCEPTION 'Pack not found';
  END IF;

  IF NOT (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'org_admin'::app_role, _board_org_id)
    OR has_role(auth.uid(), 'chair'::app_role, _board_org_id)
  ) THEN
    RAISE EXCEPTION 'Unauthorized: only administrators or chairs can unlock a pack';
  END IF;

  UPDATE board_packs
  SET status = 'draft',
      finalised_at = NULL,
      finalised_by = NULL
  WHERE id = _pack_id;
END;
$$;
