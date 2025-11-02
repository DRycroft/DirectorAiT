-- Create board_members table with Public/Internal/Confidential fields
CREATE TABLE public.board_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Public fields (can be published with consent)
  full_name TEXT NOT NULL,
  preferred_title TEXT,
  public_job_title TEXT,
  short_bio TEXT,
  public_photo_url TEXT,
  public_company_affiliations TEXT,
  professional_qualifications TEXT,
  public_social_links JSONB DEFAULT '{}'::jsonb,
  public_contact_email TEXT,
  
  -- Internal fields (visible to board members)
  legal_name TEXT,
  personal_mobile TEXT,
  personal_email TEXT,
  cv_file_url TEXT,
  detailed_work_history TEXT,
  appointment_date DATE,
  term_expiry DATE,
  reappointment_history JSONB DEFAULT '[]'::jsonb,
  skills_competencies JSONB DEFAULT '[]'::jsonb,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  
  -- Confidential fields (admin only)
  national_id TEXT,
  home_address TEXT,
  sensitive_notes TEXT,
  
  -- Consent & publishing
  publish_preferences JSONB DEFAULT '{}'::jsonb,
  consent_signed_at TIMESTAMPTZ,
  consent_signature TEXT,
  
  -- Status & metadata
  status TEXT DEFAULT 'invited' CHECK (status IN ('invited', 'pending', 'active', 'inactive')),
  invite_token TEXT UNIQUE,
  invite_sent_at TIMESTAMPTZ,
  profile_completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create COI table
CREATE TABLE public.board_member_coi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.board_members(id) ON DELETE CASCADE,
  
  declared_interest TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('financial', 'familial', 'contractual', 'other')),
  related_party_name TEXT,
  date_declared DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'mitigated', 'resolved')),
  management_steps TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create audit trail for member changes
CREATE TABLE public.board_member_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.board_members(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES auth.users(id),
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  change_type TEXT NOT NULL CHECK (change_type IN ('created', 'updated', 'published', 'unpublished')),
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_member_coi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_member_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies for board_members
CREATE POLICY "Board members can view members in their boards"
  ON public.board_members FOR SELECT
  USING (
    board_id IN (
      SELECT board_id FROM public.board_memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage board members"
  ON public.board_members FOR ALL
  USING (
    has_role(auth.uid(), 'org_admin'::app_role) OR 
    has_role(auth.uid(), 'chair'::app_role)
  );

CREATE POLICY "Members can complete their own profile"
  ON public.board_members FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for COI
CREATE POLICY "Board members can view COI in their boards"
  ON public.board_member_coi FOR SELECT
  USING (
    member_id IN (
      SELECT id FROM public.board_members 
      WHERE board_id IN (
        SELECT board_id FROM public.board_memberships 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Members can manage their own COI"
  ON public.board_member_coi FOR ALL
  USING (
    member_id IN (
      SELECT id FROM public.board_members WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for audit
CREATE POLICY "Admins can view audit logs"
  ON public.board_member_audit FOR SELECT
  USING (
    has_role(auth.uid(), 'org_admin'::app_role) OR 
    has_role(auth.uid(), 'chair'::app_role)
  );

CREATE POLICY "System can create audit logs"
  ON public.board_member_audit FOR INSERT
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_board_members_updated_at
  BEFORE UPDATE ON public.board_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_board_member_coi_updated_at
  BEFORE UPDATE ON public.board_member_coi
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate invite token
CREATE OR REPLACE FUNCTION public.generate_member_invite_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$;