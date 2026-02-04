-- Drop all existing org-scoped storage policies first (they may already exist)
DROP POLICY IF EXISTS "Org members can view board documents" ON storage.objects;
DROP POLICY IF EXISTS "Org members can upload board documents" ON storage.objects;
DROP POLICY IF EXISTS "Org members can update board documents" ON storage.objects;
DROP POLICY IF EXISTS "Org members can delete board documents" ON storage.objects;
DROP POLICY IF EXISTS "Org members can view executive reports" ON storage.objects;
DROP POLICY IF EXISTS "Org members can upload executive reports" ON storage.objects;
DROP POLICY IF EXISTS "Org members can view meeting minutes" ON storage.objects;
DROP POLICY IF EXISTS "Org members can upload meeting minutes" ON storage.objects;
DROP POLICY IF EXISTS "Org members can view special papers" ON storage.objects;
DROP POLICY IF EXISTS "Org members can upload special papers" ON storage.objects;

-- Drop legacy overly permissive policies
DROP POLICY IF EXISTS "Users can view documents in their org" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload documents to their org" ON storage.objects;
DROP POLICY IF EXISTS "Users can update documents in their org" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete documents in their org" ON storage.objects;
DROP POLICY IF EXISTS "Users can view reports in their org" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload reports" ON storage.objects;
DROP POLICY IF EXISTS "Users can view minutes in their org" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload minutes" ON storage.objects;
DROP POLICY IF EXISTS "Users can view special papers in their org" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload special papers" ON storage.objects;

-- Create secure org-scoped policies for board-documents
CREATE POLICY "Org members can view board documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'board-documents' AND
  (
    owner = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.org_id = (
        SELECT p2.org_id FROM public.profiles p2 
        WHERE p2.id = storage.objects.owner
      )
    )
  )
);

CREATE POLICY "Org members can upload board documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'board-documents' AND owner = auth.uid());

CREATE POLICY "Org members can update board documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'board-documents' AND
  (owner = auth.uid() OR public.has_role(auth.uid(), 'org_admin') OR public.has_role(auth.uid(), 'chair'))
);

CREATE POLICY "Org members can delete board documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'board-documents' AND
  (owner = auth.uid() OR public.has_role(auth.uid(), 'org_admin') OR public.has_role(auth.uid(), 'chair'))
);

-- Create secure org-scoped policies for executive-reports
CREATE POLICY "Org members can view executive reports"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'executive-reports' AND
  (
    owner = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.org_id = (SELECT p2.org_id FROM public.profiles p2 WHERE p2.id = storage.objects.owner)
    )
  )
);

CREATE POLICY "Org members can upload executive reports"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'executive-reports' AND owner = auth.uid());

-- Create secure org-scoped policies for meeting-minutes
CREATE POLICY "Org members can view meeting minutes"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'meeting-minutes' AND
  (
    owner = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.org_id = (SELECT p2.org_id FROM public.profiles p2 WHERE p2.id = storage.objects.owner)
    )
  )
);

CREATE POLICY "Org members can upload meeting minutes"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'meeting-minutes' AND owner = auth.uid());

-- Create secure org-scoped policies for special-papers
CREATE POLICY "Org members can view special papers"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'special-papers' AND
  (
    owner = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.org_id = (SELECT p2.org_id FROM public.profiles p2 WHERE p2.id = storage.objects.owner)
    )
  )
);

CREATE POLICY "Org members can upload special papers"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'special-papers' AND owner = auth.uid());

-- Update generate_member_invite_token with authorization checks
DROP FUNCTION IF EXISTS public.generate_member_invite_token();
DROP FUNCTION IF EXISTS public.generate_member_invite_token(uuid);

CREATE OR REPLACE FUNCTION public.generate_member_invite_token(_board_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If board_id provided, verify caller has permission to create invites
  IF _board_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.board_memberships
      WHERE board_id = _board_id 
      AND user_id = auth.uid()
      AND role IN ('chair', 'admin', 'owner')
    ) AND NOT public.has_role(auth.uid(), 'org_admin') AND NOT public.has_role(auth.uid(), 'chair') THEN
      RAISE EXCEPTION 'Unauthorized: Only board admins can generate invite tokens';
    END IF;
  END IF;
  
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$;

-- Update create_default_staff_form_templates with org validation
CREATE OR REPLACE FUNCTION public.create_default_staff_form_templates(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify caller belongs to the organization
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND org_id = p_org_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: User does not belong to this organization';
  END IF;

  INSERT INTO public.staff_form_templates (org_id, form_type, fields)
  VALUES (p_org_id, 'board_members', '[{"id":"full_name","label":"Full Name","required":true,"enabled":true,"field_type":"text","order":0,"locked":true}]'::jsonb)
  ON CONFLICT (org_id, form_type) DO NOTHING;

  INSERT INTO public.staff_form_templates (org_id, form_type, fields)
  VALUES (p_org_id, 'executive_team', '[{"id":"full_name","label":"Full Name","required":true,"enabled":true,"field_type":"text","order":0,"locked":true}]'::jsonb)
  ON CONFLICT (org_id, form_type) DO NOTHING;

  INSERT INTO public.staff_form_templates (org_id, form_type, fields)
  VALUES (p_org_id, 'key_staff', '[{"id":"full_name","label":"Full Name","required":true,"enabled":true,"field_type":"text","order":0,"locked":true}]'::jsonb)
  ON CONFLICT (org_id, form_type) DO NOTHING;
END;
$$;