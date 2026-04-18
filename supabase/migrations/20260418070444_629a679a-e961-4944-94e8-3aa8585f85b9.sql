CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND _role = 'super_admin'::public.app_role
      AND org_id IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.block_super_admin_client_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.role = 'super_admin'::public.app_role
     AND COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
    RAISE EXCEPTION 'super_admin role can only be assigned by service_role';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_super_admin_client_insert ON public.user_roles;
CREATE TRIGGER trg_block_super_admin_client_insert
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.block_super_admin_client_insert();

CREATE OR REPLACE FUNCTION public.get_pending_member_count(_org_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(COUNT(*), 0)::integer
  FROM public.board_members bm
  JOIN public.boards b ON b.id = bm.board_id
  WHERE b.org_id = _org_id
    AND bm.status = 'pending'
    AND (
      public.has_role(auth.uid(), 'super_admin'::public.app_role)
      OR public.has_role(auth.uid(), 'org_admin'::public.app_role, _org_id)
    );
$$;