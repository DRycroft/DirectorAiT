CREATE OR REPLACE FUNCTION public.get_pending_member_count(_org_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(*), 0)::integer
  FROM public.board_members bm
  JOIN public.boards b ON b.id = bm.board_id
  WHERE b.org_id = _org_id
    AND bm.status = 'pending'
    AND (
      public.has_role(auth.uid(), 'super_admin'::app_role)
      OR public.has_role(auth.uid(), 'org_admin'::app_role, _org_id)
      OR public.has_role(auth.uid(), 'chair'::app_role, _org_id)
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_pending_member_count(uuid) TO authenticated;