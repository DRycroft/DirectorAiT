-- Create storage bucket for executive reports
INSERT INTO storage.buckets (id, name, public)
VALUES ('executive-reports', 'executive-reports', false);

-- Create executive_reports table
CREATE TABLE public.executive_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  uploaded_by_name TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  period_covered TEXT NOT NULL,
  board_id UUID REFERENCES public.boards(id),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.executive_reports ENABLE ROW LEVEL SECURITY;

-- Users can view reports in their organization
CREATE POLICY "Users can view reports in their org"
ON public.executive_reports
FOR SELECT
USING (
  org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  )
);

-- Users can upload reports to their organization
CREATE POLICY "Users can upload reports"
ON public.executive_reports
FOR INSERT
WITH CHECK (
  uploaded_by = auth.uid() AND
  org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  )
);

-- Users can update their own reports
CREATE POLICY "Users can update their own reports"
ON public.executive_reports
FOR UPDATE
USING (uploaded_by = auth.uid());

-- Admins can update any report in their org
CREATE POLICY "Admins can update reports"
ON public.executive_reports
FOR UPDATE
USING (
  has_role(auth.uid(), 'org_admin'::app_role) OR 
  has_role(auth.uid(), 'chair'::app_role)
);

-- Storage policies for executive reports bucket
CREATE POLICY "Users can upload reports to their org folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'executive-reports' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view reports in their org"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'executive-reports' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own reports"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'executive-reports' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create index for better query performance
CREATE INDEX idx_executive_reports_org_id ON public.executive_reports(org_id);
CREATE INDEX idx_executive_reports_board_id ON public.executive_reports(board_id);
CREATE INDEX idx_executive_reports_report_type ON public.executive_reports(report_type);