-- Two-person approval system
CREATE TABLE IF NOT EXISTS public.approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  first_approver UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_approved_at TIMESTAMP WITH TIME ZONE,
  second_approver UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  second_approved_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',
  request_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT different_approvers CHECK (first_approver IS NULL OR second_approver IS NULL OR first_approver != second_approver),
  CONSTRAINT status_check CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'))
);

-- Enable RLS
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

-- Policies for approval requests
CREATE POLICY "Users can view approval requests in their org"
  ON public.approval_requests FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create approval requests"
  ON public.approval_requests FOR INSERT
  WITH CHECK (
    requested_by = auth.uid() AND
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Approvers can update approval requests"
  ON public.approval_requests FOR UPDATE
  USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()) AND
    (has_role(auth.uid(), 'org_admin'::app_role) OR has_role(auth.uid(), 'chair'::app_role))
  );

-- Admin hierarchy table
CREATE TABLE IF NOT EXISTS public.org_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_type TEXT NOT NULL CHECK (admin_type IN ('primary', 'secondary')),
  appointed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  appointed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(org_id, admin_type),
  UNIQUE(org_id, user_id)
);

-- Enable RLS
ALTER TABLE public.org_admins ENABLE ROW LEVEL SECURITY;

-- Policies for org_admins
CREATE POLICY "Users can view admins in their org"
  ON public.org_admins FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Org admins can manage admin assignments"
  ON public.org_admins FOR ALL
  USING (has_role(auth.uid(), 'org_admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_approval_requests_updated_at
  BEFORE UPDATE ON public.approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indices for performance
CREATE INDEX idx_approval_requests_org_id ON public.approval_requests(org_id);
CREATE INDEX idx_approval_requests_status ON public.approval_requests(status);
CREATE INDEX idx_approval_requests_requested_by ON public.approval_requests(requested_by);
CREATE INDEX idx_org_admins_org_id ON public.org_admins(org_id);