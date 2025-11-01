-- Create storage bucket for meeting minutes
INSERT INTO storage.buckets (id, name, public)
VALUES ('meeting-minutes', 'meeting-minutes', false);

-- Create storage bucket for special papers
INSERT INTO storage.buckets (id, name, public)
VALUES ('special-papers', 'special-papers', false);

-- Create meeting_minutes table
CREATE TABLE public.meeting_minutes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_date DATE NOT NULL,
  meeting_type TEXT NOT NULL DEFAULT 'Regular Board Meeting',
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  uploaded_by_name TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'draft',
  board_id UUID REFERENCES public.boards(id),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create special_papers table
CREATE TABLE public.special_papers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  uploaded_by_name TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  board_id UUID REFERENCES public.boards(id),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on meeting_minutes
ALTER TABLE public.meeting_minutes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view minutes in their org"
ON public.meeting_minutes FOR SELECT
USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can upload minutes"
ON public.meeting_minutes FOR INSERT
WITH CHECK (uploaded_by = auth.uid() AND org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their own minutes"
ON public.meeting_minutes FOR UPDATE
USING (uploaded_by = auth.uid());

CREATE POLICY "Admins can update minutes"
ON public.meeting_minutes FOR UPDATE
USING (has_role(auth.uid(), 'org_admin'::app_role) OR has_role(auth.uid(), 'chair'::app_role));

-- Enable RLS on special_papers
ALTER TABLE public.special_papers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view special papers in their org"
ON public.special_papers FOR SELECT
USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can upload special papers"
ON public.special_papers FOR INSERT
WITH CHECK (uploaded_by = auth.uid() AND org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their own special papers"
ON public.special_papers FOR UPDATE
USING (uploaded_by = auth.uid());

CREATE POLICY "Admins can update special papers"
ON public.special_papers FOR UPDATE
USING (has_role(auth.uid(), 'org_admin'::app_role) OR has_role(auth.uid(), 'chair'::app_role));

-- Storage policies for meeting-minutes bucket
CREATE POLICY "Users can upload minutes to their org folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'meeting-minutes' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view minutes in their org"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'meeting-minutes' AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can delete their own minutes"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'meeting-minutes' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for special-papers bucket
CREATE POLICY "Users can upload special papers to their org folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'special-papers' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view special papers in their org"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'special-papers' AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can delete their own special papers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'special-papers' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create indexes
CREATE INDEX idx_meeting_minutes_org_id ON public.meeting_minutes(org_id);
CREATE INDEX idx_meeting_minutes_meeting_date ON public.meeting_minutes(meeting_date);
CREATE INDEX idx_special_papers_org_id ON public.special_papers(org_id);
CREATE INDEX idx_special_papers_deadline ON public.special_papers(deadline);