-- Create board_papers table for storing created board papers
CREATE TABLE public.board_papers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  board_id UUID REFERENCES public.boards(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  period_covered TEXT NOT NULL,
  template_id UUID REFERENCES public.board_paper_templates(id) ON DELETE SET NULL,
  content JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.board_papers ENABLE ROW LEVEL SECURITY;

-- Users can view board papers in their org
CREATE POLICY "Users can view board papers in their org"
ON public.board_papers
FOR SELECT
USING (
  org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  )
);

-- Users can create board papers
CREATE POLICY "Users can create board papers"
ON public.board_papers
FOR INSERT
WITH CHECK (
  created_by = auth.uid() AND
  org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  )
);

-- Users can update their own board papers
CREATE POLICY "Users can update their own board papers"
ON public.board_papers
FOR UPDATE
USING (created_by = auth.uid());

-- Admins can update any board papers in their org
CREATE POLICY "Admins can update board papers in their org"
ON public.board_papers
FOR UPDATE
USING (
  has_role(auth.uid(), 'org_admin'::app_role) OR 
  has_role(auth.uid(), 'chair'::app_role)
);

-- Users can delete their own board papers
CREATE POLICY "Users can delete their own board papers"
ON public.board_papers
FOR DELETE
USING (created_by = auth.uid());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_board_papers_updated_at
BEFORE UPDATE ON public.board_papers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_board_papers_org_id ON public.board_papers(org_id);
CREATE INDEX idx_board_papers_created_by ON public.board_papers(created_by);
CREATE INDEX idx_board_papers_status ON public.board_papers(status);