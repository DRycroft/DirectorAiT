-- SECURE GOVERNANCE FRAMEWORK - STAGE 1
-- Roles, board settings, role helper, submissions, audit trigger

-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM (
  'super_admin',
  'org_admin', 
  'chair',
  'director',
  'executive',
  'staff',
  'observer',
  'external_guest'
);

-- 2. Create user_roles junction table (SECURE - prevents privilege escalation)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function (bypasses RLS, prevents recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- 4. Migrate existing profile.role data to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::app_role 
FROM public.profiles 
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Create roles metadata table (for UI display)
CREATE TABLE IF NOT EXISTS public.roles (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.roles (id, display_name, description) VALUES
  ('super_admin', 'Super Admin', 'Platform operators'),
  ('org_admin', 'Org Admin', 'Organization administrator'),
  ('chair', 'Chair', 'Board chair'),
  ('director', 'Director', 'Board member with voting rights'),
  ('executive', 'Executive', 'CEO/C-suite executives'),
  ('staff', 'Staff', 'Frontline staff'),
  ('observer', 'Observer', 'Read-only access'),
  ('external_guest', 'External Guest', 'Time-limited access')
ON CONFLICT (id) DO NOTHING;

-- 6. Create board_settings
CREATE TABLE IF NOT EXISTS public.board_settings (
  board_id UUID PRIMARY KEY REFERENCES public.boards(id) ON DELETE CASCADE,
  quorum_percent INTEGER DEFAULT 50 CHECK (quorum_percent > 0 AND quorum_percent <= 100),
  vote_threshold INTEGER DEFAULT 50 CHECK (vote_threshold > 0 AND vote_threshold <= 100),
  supermajority_threshold INTEGER DEFAULT 66 CHECK (supermajority_threshold > 0 AND supermajority_threshold <= 100),
  silent_vote_window INTEGER DEFAULT 48 CHECK (silent_vote_window > 0),
  reveal_policy TEXT DEFAULT 'chair_controlled' CHECK (reveal_policy IN ('chair_controlled', 'immediate', 'after_quorum')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.board_settings ENABLE ROW LEVEL SECURITY;

-- 7. Create board_role_overrides (board-specific role assignments)
CREATE TABLE IF NOT EXISTS public.board_role_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES public.roles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(board_id, profile_id, role_id)
);

ALTER TABLE public.board_role_overrides ENABLE ROW LEVEL SECURITY;

-- 8. Create document_submissions
CREATE TABLE IF NOT EXISTS public.document_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.archived_documents(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ
);

ALTER TABLE public.document_submissions ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES

-- user_roles: Only admins can view/manage
CREATE POLICY "Admins can view all user roles" ON public.user_roles
  FOR SELECT USING (
    public.has_role(auth.uid(), 'super_admin'::app_role) OR 
    public.has_role(auth.uid(), 'org_admin'::app_role)
  );

CREATE POLICY "Admins can manage user roles" ON public.user_roles
  FOR ALL USING (
    public.has_role(auth.uid(), 'super_admin'::app_role) OR 
    public.has_role(auth.uid(), 'org_admin'::app_role)
  );

-- board_settings: Board members can view, admins/chair can update
CREATE POLICY "Board members can view settings" ON public.board_settings
  FOR SELECT USING (
    board_id IN (
      SELECT board_id FROM public.board_memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and chairs can update settings" ON public.board_settings
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'chair'::app_role) OR
    public.has_role(auth.uid(), 'org_admin'::app_role)
  );

-- board_role_overrides: Board members can view, admins can manage
CREATE POLICY "Board members can view role overrides" ON public.board_role_overrides
  FOR SELECT USING (
    board_id IN (
      SELECT board_id FROM public.board_memberships WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage role overrides" ON public.board_role_overrides
  FOR ALL USING (
    public.has_role(auth.uid(), 'org_admin'::app_role) OR
    public.has_role(auth.uid(), 'chair'::app_role)
  );

-- document_submissions: Users can create, approvers can review
CREATE POLICY "Users can create submissions" ON public.document_submissions
  FOR INSERT WITH CHECK (submitted_by = auth.uid());

CREATE POLICY "Users can view submissions in their org" ON public.document_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.archived_documents ad
      JOIN public.profiles p ON p.org_id = ad.org_id
      WHERE ad.id = document_submissions.document_id AND p.id = auth.uid()
    )
  );

CREATE POLICY "Approvers can review submissions" ON public.document_submissions
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'chair'::app_role) OR
    public.has_role(auth.uid(), 'org_admin'::app_role) OR
    public.has_role(auth.uid(), 'executive'::app_role)
  );

-- 9. Audit trigger for submission reviews
CREATE OR REPLACE FUNCTION public.log_submission_review()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.audit_log (
      entity_type, 
      entity_id, 
      actor_id, 
      action, 
      detail_json,
      timestamp
    ) VALUES (
      'document_submission',
      NEW.id,
      auth.uid(),
      'submission_reviewed',
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'comments', NEW.comments,
        'reviewed_by', NEW.reviewed_by
      ),
      now()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trig_log_submission_review
  AFTER UPDATE ON public.document_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_submission_review();

-- Trigger for updated_at on board_settings
CREATE TRIGGER update_board_settings_updated_at
  BEFORE UPDATE ON public.board_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();