-- C1: Fix has_role(uuid, app_role) — currently returns false for any non super_admin role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$function$;

-- C2: Close cross-tenant read on pack_summaries
DROP POLICY IF EXISTS "View pack summary if can view pack" ON public.pack_summaries;
DROP POLICY IF EXISTS "View pack summary in own org" ON public.pack_summaries;
DROP POLICY IF EXISTS "Users can view summaries" ON public.pack_summaries;

CREATE POLICY "View pack summary in own org"
ON public.pack_summaries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.board_packs bp
    JOIN public.boards b ON b.id = bp.board_id
    WHERE bp.id = pack_summaries.pack_id
      AND b.org_id = public.get_user_org_id(auth.uid())
  )
);

-- C3: Remove recursion risk on profiles SELECT while preserving limited colleague visibility
DROP POLICY IF EXISTS "Users can view limited profile data of board colleagues" ON public.profiles;

CREATE POLICY "Users can view limited profile data of board colleagues"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR (
    org_id IS NOT NULL
    AND org_id = public.get_user_org_id(auth.uid())
    AND (
      public.has_role(auth.uid(), 'org_admin'::public.app_role, org_id)
      OR public.has_role(auth.uid(), 'chair'::public.app_role, org_id)
    )
  )
  OR EXISTS (
    SELECT 1
    FROM public.board_memberships bm1
    JOIN public.board_memberships bm2 ON bm1.board_id = bm2.board_id
    WHERE bm1.user_id = auth.uid()
      AND bm2.user_id = profiles.id
  )
);