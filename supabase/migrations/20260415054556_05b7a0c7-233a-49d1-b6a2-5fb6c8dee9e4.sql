
BEGIN;

-- ============================================================
-- REPAIR: user_roles (3 policies) — direct org_id
-- ============================================================

DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
CREATE POLICY "Admins can view all user roles"
ON public.user_roles FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'org_admin', user_roles.org_id)
);

DROP POLICY IF EXISTS "Only admins can modify roles" ON public.user_roles;
CREATE POLICY "Only admins can modify roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'org_admin', user_roles.org_id)
);

DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;
CREATE POLICY "Only admins can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'org_admin', user_roles.org_id)
);

-- ============================================================
-- REPAIR: document_submissions — join to archived_documents.org_id
-- ============================================================

DROP POLICY IF EXISTS "Approvers can review submissions" ON public.document_submissions;
CREATE POLICY "Approvers can review submissions"
ON public.document_submissions FOR UPDATE
USING (
  has_role(auth.uid(), 'super_admin')
  OR EXISTS (
    SELECT 1 FROM archived_documents ad
    WHERE ad.id = document_submissions.document_id
    AND (
      has_role(auth.uid(), 'chair', ad.org_id)
      OR has_role(auth.uid(), 'org_admin', ad.org_id)
      OR has_role(auth.uid(), 'executive', ad.org_id)
    )
  )
);

-- ============================================================
-- REPAIR: templates (2 policies) — direct org_id
-- ============================================================

DROP POLICY IF EXISTS "Users can update their own templates" ON public.templates;
CREATE POLICY "Users can update their own templates"
ON public.templates FOR UPDATE
USING (
  (author_id = auth.uid())
  OR has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'org_admin', templates.org_id)
);

DROP POLICY IF EXISTS "Users can delete their own templates" ON public.templates;
CREATE POLICY "Users can delete their own templates"
ON public.templates FOR DELETE
USING (
  (author_id = auth.uid())
  OR has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'org_admin', templates.org_id)
);

-- ============================================================
-- REPAIR: template_approvals (2 policies) — join to templates.org_id
-- ============================================================

DROP POLICY IF EXISTS "Users can view approval requests" ON public.template_approvals;
CREATE POLICY "Users can view approval requests"
ON public.template_approvals FOR SELECT
USING (
  (requested_by = auth.uid())
  OR has_role(auth.uid(), 'super_admin')
  OR EXISTS (
    SELECT 1 FROM templates t
    WHERE t.id = template_approvals.template_id
    AND (
      has_role(auth.uid(), 'org_admin', t.org_id)
      OR has_role(auth.uid(), 'chair', t.org_id)
    )
  )
);

DROP POLICY IF EXISTS "Admins can update approvals" ON public.template_approvals;
CREATE POLICY "Admins can update approvals"
ON public.template_approvals FOR UPDATE
USING (
  has_role(auth.uid(), 'super_admin')
  OR EXISTS (
    SELECT 1 FROM templates t
    WHERE t.id = template_approvals.template_id
    AND (
      has_role(auth.uid(), 'org_admin', t.org_id)
      OR has_role(auth.uid(), 'chair', t.org_id)
    )
  )
);

-- ============================================================
-- REPAIR: extracted_decisions — join to archived_documents.org_id
-- ============================================================

DROP POLICY IF EXISTS "Board members can view decisions" ON public.extracted_decisions;
CREATE POLICY "Board members can view decisions"
ON public.extracted_decisions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM archived_documents ad
    JOIN board_memberships bm ON bm.board_id = ad.board_id
    WHERE ad.id = extracted_decisions.document_id
    AND bm.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'super_admin')
  OR EXISTS (
    SELECT 1 FROM archived_documents ad
    WHERE ad.id = extracted_decisions.document_id
    AND has_role(auth.uid(), 'org_admin', ad.org_id)
  )
);

-- ============================================================
-- REPAIR: staff_form_templates — direct org_id
-- ============================================================

DROP POLICY IF EXISTS "Admins can manage templates" ON public.staff_form_templates;
CREATE POLICY "Admins can manage templates"
ON public.staff_form_templates FOR ALL
USING (
  has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'org_admin', staff_form_templates.org_id)
  OR has_role(auth.uid(), 'chair', staff_form_templates.org_id)
);

-- ============================================================
-- REPAIR: executive_reports — direct org_id
-- ============================================================

DROP POLICY IF EXISTS "Admins can update reports" ON public.executive_reports;
CREATE POLICY "Admins can update reports"
ON public.executive_reports FOR UPDATE
USING (
  has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'org_admin', executive_reports.org_id)
  OR has_role(auth.uid(), 'chair', executive_reports.org_id)
);

-- ============================================================
-- REPAIR: meeting_minutes — direct org_id
-- ============================================================

DROP POLICY IF EXISTS "Admins can update minutes" ON public.meeting_minutes;
CREATE POLICY "Admins can update minutes"
ON public.meeting_minutes FOR UPDATE
USING (
  has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'org_admin', meeting_minutes.org_id)
  OR has_role(auth.uid(), 'chair', meeting_minutes.org_id)
);

-- ============================================================
-- REPAIR: special_papers — direct org_id
-- ============================================================

DROP POLICY IF EXISTS "Admins can update special papers" ON public.special_papers;
CREATE POLICY "Admins can update special papers"
ON public.special_papers FOR UPDATE
USING (
  has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'org_admin', special_papers.org_id)
  OR has_role(auth.uid(), 'chair', special_papers.org_id)
);

-- ============================================================
-- REPAIR: signon_responses — direct org_id
-- ============================================================

DROP POLICY IF EXISTS "Only admins can view signon responses" ON public.signon_responses;
CREATE POLICY "Only admins can view signon responses"
ON public.signon_responses FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin')
  OR (
    signon_responses.org_id = (SELECT p.org_id FROM profiles p WHERE p.id = auth.uid())
    AND (
      has_role(auth.uid(), 'org_admin', signon_responses.org_id)
      OR has_role(auth.uid(), 'chair', signon_responses.org_id)
    )
  )
);

-- ============================================================
-- REPAIR: profiles — direct org_id
-- ============================================================

DROP POLICY IF EXISTS "Users can view limited profile data of board colleagues" ON public.profiles;
CREATE POLICY "Users can view limited profile data of board colleagues"
ON public.profiles FOR SELECT
USING (
  (id = auth.uid())
  OR has_role(auth.uid(), 'super_admin')
  OR (
    has_role(auth.uid(), 'org_admin', profiles.org_id)
    AND profiles.org_id = (SELECT p.org_id FROM profiles p WHERE p.id = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM board_memberships bm1
    JOIN board_memberships bm2 ON bm1.board_id = bm2.board_id
    WHERE bm1.user_id = auth.uid() AND bm2.user_id = profiles.id
  )
);

-- ============================================================
-- REPAIR: org_admins — direct org_id
-- ============================================================

DROP POLICY IF EXISTS "Org admins can manage admin assignments" ON public.org_admins;
CREATE POLICY "Org admins can manage admin assignments"
ON public.org_admins FOR ALL
USING (
  has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'org_admin', org_admins.org_id)
);

-- ============================================================
-- REPAIR: organizations — row id IS the org
-- ============================================================

DROP POLICY IF EXISTS "Only org admins can update organization" ON public.organizations;
CREATE POLICY "Only org admins can update organization"
ON public.organizations FOR UPDATE
USING (
  (id = (SELECT p.org_id FROM profiles p WHERE p.id = auth.uid()))
  AND (
    has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'org_admin', organizations.id)
    OR has_role(auth.uid(), 'chair', organizations.id)
  )
)
WITH CHECK (
  (id = (SELECT p.org_id FROM profiles p WHERE p.id = auth.uid()))
  AND (
    has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'org_admin', organizations.id)
    OR has_role(auth.uid(), 'chair', organizations.id)
  )
);

COMMIT;
