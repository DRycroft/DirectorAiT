
-- ============================================================
-- V3 ORGANISATION-SCOPED ROLES MIGRATION
-- Wrapped in explicit transaction for atomicity
-- ============================================================

BEGIN;

-- ============================================================
-- PHASE 1: Schema changes
-- ============================================================

-- 1a. Add org_id column to user_roles
ALTER TABLE public.user_roles
ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 1b. Backfill org_id from profiles
UPDATE public.user_roles ur
SET org_id = p.org_id
FROM public.profiles p
WHERE ur.user_id = p.id
AND ur.role != 'super_admin'
AND p.org_id IS NOT NULL;

-- 1c. Fail-safe: abort if any non-super_admin rows still have NULL org_id
DO $$
DECLARE
  orphan_count integer;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM public.user_roles
  WHERE role != 'super_admin' AND org_id IS NULL;
  
  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'MIGRATION ABORTED: % non-super_admin user_roles rows have NULL org_id after backfill', orphan_count;
  END IF;
END $$;

-- 1d. Add CHECK constraint for role/org consistency
ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_org_id_role_check CHECK (
  (role = 'super_admin' AND org_id IS NULL) OR
  (role != 'super_admin' AND org_id IS NOT NULL)
);

-- 1e. Drop old unique constraint
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

-- 1f. Create partial unique indexes
CREATE UNIQUE INDEX user_roles_super_admin_unique
ON public.user_roles (user_id, role)
WHERE role = 'super_admin';

CREATE UNIQUE INDEX user_roles_org_role_unique
ON public.user_roles (user_id, role, org_id)
WHERE role != 'super_admin';

-- 1g. Supporting index for org_id lookups
CREATE INDEX idx_user_roles_org_id ON public.user_roles (org_id);

-- ============================================================
-- PHASE 2: Function updates
-- ============================================================

-- 2a. Replace 2-arg has_role: strict super_admin only
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _role = 'super_admin' THEN
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = 'super_admin'
      )
    ELSE
      false
  END;
$$;

-- 2b. Create 3-arg has_role for org-scoped checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
    AND org_id = _org_id
  );
$$;

-- 2c. Update generate_member_invite_token to use org-scoped check
CREATE OR REPLACE FUNCTION public.generate_member_invite_token(_board_id uuid DEFAULT NULL::uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_org_id uuid;
BEGIN
  -- Resolve caller's org
  SELECT org_id INTO _caller_org_id
  FROM public.profiles
  WHERE id = auth.uid();

  -- If board_id provided, verify caller has permission
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

  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$;

-- 2d. Update assign_default_role to include org_id
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.org_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, org_id)
    VALUES (NEW.id, 'observer'::app_role, NEW.org_id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- PHASE 3: RLS policy updates
-- ============================================================

-- Helper: get_user_org_id already exists, no change needed

-- --- approval_requests ---
DROP POLICY IF EXISTS "Approvers can update approval requests" ON public.approval_requests;
CREATE POLICY "Approvers can update approval requests"
ON public.approval_requests FOR UPDATE
USING (
  (org_id IN (SELECT profiles.org_id FROM profiles WHERE profiles.id = auth.uid()))
  AND (
    has_role(auth.uid(), 'org_admin', org_id)
    OR has_role(auth.uid(), 'chair', org_id)
    OR has_role(auth.uid(), 'super_admin')
  )
);

-- --- archived_documents ---
DROP POLICY IF EXISTS "Board members can view documents" ON public.archived_documents;
CREATE POLICY "Board members can view documents"
ON public.archived_documents FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM board_memberships
    WHERE board_memberships.user_id = auth.uid()
    AND board_memberships.board_id = archived_documents.board_id
  )
  OR has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'org_admin', archived_documents.org_id)
);

-- --- audit_log ---
DROP POLICY IF EXISTS "Admins can view audit log" ON public.audit_log;
CREATE POLICY "Admins can view audit log"
ON public.audit_log FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'org_admin', get_user_org_id(auth.uid()))
);

-- --- board_member_audit ---
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.board_member_audit;
CREATE POLICY "Admins can view audit logs"
ON public.board_member_audit FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin')
  OR EXISTS (
    SELECT 1 FROM board_members bm
    JOIN boards b ON b.id = bm.board_id
    WHERE bm.id = board_member_audit.member_id
    AND has_role(auth.uid(), 'org_admin', b.org_id)
  )
  OR EXISTS (
    SELECT 1 FROM board_members bm
    JOIN boards b ON b.id = bm.board_id
    WHERE bm.id = board_member_audit.member_id
    AND has_role(auth.uid(), 'chair', b.org_id)
  )
);

-- --- board_members: "Admins can manage board members" ---
DROP POLICY IF EXISTS "Admins can manage board members" ON public.board_members;
CREATE POLICY "Admins can manage board members"
ON public.board_members FOR ALL
USING (
  has_role(auth.uid(), 'super_admin')
  OR EXISTS (
    SELECT 1 FROM boards b
    WHERE b.id = board_members.board_id
    AND (
      has_role(auth.uid(), 'org_admin', b.org_id)
      OR has_role(auth.uid(), 'chair', b.org_id)
    )
  )
);

-- --- board_memberships: "Admins can view all memberships" ---
DROP POLICY IF EXISTS "Admins can view all memberships" ON public.board_memberships;
CREATE POLICY "Admins can view all memberships"
ON public.board_memberships FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'super_admin')
  OR EXISTS (
    SELECT 1 FROM boards b
    WHERE b.id = board_memberships.board_id
    AND has_role(auth.uid(), 'org_admin', b.org_id)
  )
);

-- --- board_papers: "Admins can update board papers in their org" ---
DROP POLICY IF EXISTS "Admins can update board papers in their org" ON public.board_papers;
CREATE POLICY "Admins can update board papers in their org"
ON public.board_papers FOR UPDATE
USING (
  has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'org_admin', board_papers.org_id)
  OR has_role(auth.uid(), 'chair', board_papers.org_id)
);

-- --- board_role_overrides: "Admins can manage role overrides" ---
DROP POLICY IF EXISTS "Admins can manage role overrides" ON public.board_role_overrides;
CREATE POLICY "Admins can manage role overrides"
ON public.board_role_overrides FOR ALL
USING (
  has_role(auth.uid(), 'super_admin')
  OR EXISTS (
    SELECT 1 FROM boards b
    WHERE b.id = board_role_overrides.board_id
    AND (
      has_role(auth.uid(), 'org_admin', b.org_id)
      OR has_role(auth.uid(), 'chair', b.org_id)
    )
  )
);

-- --- board_settings: "Admins and chairs can update settings" ---
DROP POLICY IF EXISTS "Admins and chairs can update settings" ON public.board_settings;
CREATE POLICY "Admins and chairs can update settings"
ON public.board_settings FOR UPDATE
USING (
  has_role(auth.uid(), 'super_admin')
  OR EXISTS (
    SELECT 1 FROM boards b
    WHERE b.id = board_settings.board_id
    AND (
      has_role(auth.uid(), 'org_admin', b.org_id)
      OR has_role(auth.uid(), 'chair', b.org_id)
    )
  )
);

-- --- compliance_items: "Admins can delete compliance items" ---
DROP POLICY IF EXISTS "Admins can delete compliance items" ON public.compliance_items;
CREATE POLICY "Admins can delete compliance items"
ON public.compliance_items FOR DELETE
USING (
  has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'org_admin', compliance_items.org_id)
  OR has_role(auth.uid(), 'chair', compliance_items.org_id)
);

-- --- user_roles RLS policies ---
-- Drop existing policies on user_roles and recreate with org scoping
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;

CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Org admins can view org roles"
ON public.user_roles FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'org_admin', user_roles.org_id)
);

CREATE POLICY "Org admins can insert org roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'org_admin', org_id)
);

CREATE POLICY "Org admins can update org roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'org_admin', user_roles.org_id)
);

CREATE POLICY "Org admins can delete org roles"
ON public.user_roles FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'org_admin', user_roles.org_id)
);

COMMIT;
