-- Create committee_memberships table to link board members to committees
CREATE TABLE public.committee_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  committee_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.board_members(id) ON DELETE CASCADE,
  committee_role TEXT NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(committee_id, member_id)
);

-- Enable RLS
ALTER TABLE public.committee_memberships ENABLE ROW LEVEL SECURITY;

-- Users can view committee memberships in their org
CREATE POLICY "Users can view committee memberships in their org"
ON public.committee_memberships
FOR SELECT
USING (
  committee_id IN (
    SELECT id FROM public.boards
    WHERE org_id IN (
      SELECT org_id FROM public.profiles
      WHERE id = auth.uid()
    )
  )
);

-- Users can manage committee memberships in their org
CREATE POLICY "Users can manage committee memberships"
ON public.committee_memberships
FOR ALL
USING (
  committee_id IN (
    SELECT id FROM public.boards
    WHERE org_id IN (
      SELECT org_id FROM public.profiles
      WHERE id = auth.uid()
    )
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_committee_memberships_updated_at
BEFORE UPDATE ON public.committee_memberships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();