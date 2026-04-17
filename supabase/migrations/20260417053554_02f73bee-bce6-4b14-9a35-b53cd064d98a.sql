CREATE OR REPLACE FUNCTION public.is_board_admin_for_member(_user_id uuid, _member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.board_members bm
    JOIN public.boards b ON b.id = bm.board_id
    WHERE bm.id = _member_id
      AND (
        public.has_role(_user_id, 'super_admin'::public.app_role)
        OR public.has_role(_user_id, 'org_admin'::public.app_role, b.org_id)
        OR public.has_role(_user_id, 'chair'::public.app_role, b.org_id)
      )
  );
$function$;