-- Fix audit logging functions to add org validation
-- This ensures users can only create audit entries for their own organization

CREATE OR REPLACE FUNCTION public.log_audit_entry(
  _entity_type text,
  _entity_id uuid,
  _action text,
  _detail_json jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_org_id UUID;
  _entity_org_id UUID;
BEGIN
  -- Get user's org
  SELECT org_id INTO _user_org_id
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Get entity's org based on entity_type
  IF _entity_type = 'board_member' THEN
    SELECT b.org_id INTO _entity_org_id
    FROM public.board_members bm
    JOIN public.boards b ON b.id = bm.board_id
    WHERE bm.id = _entity_id;
  ELSIF _entity_type = 'board' THEN
    SELECT org_id INTO _entity_org_id
    FROM public.boards
    WHERE id = _entity_id;
  ELSIF _entity_type = 'document_submission' THEN
    SELECT b.org_id INTO _entity_org_id
    FROM public.document_submissions ds
    JOIN public.boards b ON b.id = ds.board_id
    WHERE ds.id = _entity_id;
  ELSIF _entity_type = 'organization' THEN
    _entity_org_id := _entity_id;
  END IF;
  
  -- Only insert if user belongs to the same org or if entity_org_id is null (system actions)
  IF _user_org_id = _entity_org_id OR _entity_org_id IS NULL THEN
    INSERT INTO public.audit_log (
      entity_type,
      entity_id,
      actor_id,
      action,
      detail_json,
      timestamp
    ) VALUES (
      _entity_type,
      _entity_id,
      auth.uid(),
      _action,
      _detail_json,
      now()
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_board_member_audit(
  _member_id uuid,
  _field_name text,
  _change_type text,
  _old_value text DEFAULT NULL::text,
  _new_value text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_org_id UUID;
  _member_org_id UUID;
BEGIN
  -- Get user's org
  SELECT org_id INTO _user_org_id
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Get member's org
  SELECT b.org_id INTO _member_org_id
  FROM public.board_members bm
  JOIN public.boards b ON b.id = bm.board_id
  WHERE bm.id = _member_id;
  
  -- Only insert if user belongs to the same org
  IF _user_org_id = _member_org_id THEN
    INSERT INTO public.board_member_audit (
      member_id,
      changed_by,
      field_name,
      change_type,
      old_value,
      new_value,
      timestamp
    ) VALUES (
      _member_id,
      auth.uid(),
      _field_name,
      _change_type,
      _old_value,
      _new_value,
      now()
    );
  END IF;
END;
$$;