-- Create document invites table for magic-link / QR actions
CREATE TABLE public.document_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  invite_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  recipient_email TEXT,
  recipient_name TEXT,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for document_invites
CREATE INDEX idx_document_invites_org_id ON public.document_invites(org_id);
CREATE INDEX idx_document_invites_token ON public.document_invites(token);
CREATE INDEX idx_document_invites_invite_type ON public.document_invites(invite_type);
CREATE INDEX idx_document_invites_status ON public.document_invites(status);
CREATE INDEX idx_document_invites_target ON public.document_invites(target_type, target_id);

-- Enable RLS
ALTER TABLE public.document_invites ENABLE ROW LEVEL SECURITY;

-- RLS policies for document_invites
CREATE POLICY "Users can view invites in their org"
ON public.document_invites
FOR SELECT
USING (org_id IN (
  SELECT org_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can create invites in their org"
ON public.document_invites
FOR INSERT
WITH CHECK (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  AND created_by = auth.uid()
);

CREATE POLICY "Users can update invites in their org"
ON public.document_invites
FOR UPDATE
USING (org_id IN (
  SELECT org_id FROM profiles WHERE id = auth.uid()
));

-- Create signon responses table
CREATE TABLE public.signon_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  invite_id UUID NOT NULL REFERENCES public.document_invites(id) ON DELETE CASCADE,
  respondent_name TEXT,
  respondent_email TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for signon_responses
CREATE INDEX idx_signon_responses_org_id ON public.signon_responses(org_id);
CREATE INDEX idx_signon_responses_invite_id ON public.signon_responses(invite_id);

-- Enable RLS
ALTER TABLE public.signon_responses ENABLE ROW LEVEL SECURITY;

-- RLS policies for signon_responses
CREATE POLICY "Users can view responses in their org"
ON public.signon_responses
FOR SELECT
USING (org_id IN (
  SELECT org_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Anyone can create signon responses"
ON public.signon_responses
FOR INSERT
WITH CHECK (true);

-- Create document acknowledgements table
CREATE TABLE public.document_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  user_id UUID NOT NULL,
  ack_type TEXT NOT NULL,
  pack_id UUID NULL,
  document_id UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for document_acknowledgements
CREATE INDEX idx_document_acknowledgements_org_id ON public.document_acknowledgements(org_id);
CREATE INDEX idx_document_acknowledgements_user_id ON public.document_acknowledgements(user_id);
CREATE INDEX idx_document_acknowledgements_pack_id ON public.document_acknowledgements(pack_id);
CREATE INDEX idx_document_acknowledgements_ack_type ON public.document_acknowledgements(ack_type);

-- Enable RLS
ALTER TABLE public.document_acknowledgements ENABLE ROW LEVEL SECURITY;

-- RLS policies for document_acknowledgements
CREATE POLICY "Users can view acknowledgements in their org"
ON public.document_acknowledgements
FOR SELECT
USING (org_id IN (
  SELECT org_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can create their own acknowledgements"
ON public.document_acknowledgements
FOR INSERT
WITH CHECK (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  AND user_id = auth.uid()
);

-- Add updated_at triggers
CREATE TRIGGER update_document_invites_updated_at
  BEFORE UPDATE ON public.document_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_signon_responses_updated_at
  BEFORE UPDATE ON public.signon_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();