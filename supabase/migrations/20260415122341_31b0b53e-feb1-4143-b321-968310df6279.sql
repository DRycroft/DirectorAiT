-- Add minutes content to agendas
ALTER TABLE public.agendas
ADD COLUMN IF NOT EXISTS minutes_content text;

-- Create meeting_decisions table
CREATE TABLE public.meeting_decisions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agenda_id uuid NOT NULL REFERENCES public.agendas(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  decision_date date NOT NULL DEFAULT CURRENT_DATE,
  outcome text DEFAULT 'approved',
  proposer text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meeting_decisions ENABLE ROW LEVEL SECURITY;

-- SELECT: board members can view decisions for their boards
CREATE POLICY "Board members can view meeting decisions"
ON public.meeting_decisions FOR SELECT
USING (
  agenda_id IN (
    SELECT a.id FROM agendas a
    WHERE a.board_id IN (
      SELECT board_memberships.board_id FROM board_memberships
      WHERE board_memberships.user_id = auth.uid()
    )
  )
);

-- INSERT: board members can create decisions
CREATE POLICY "Board members can create meeting decisions"
ON public.meeting_decisions FOR INSERT
WITH CHECK (
  agenda_id IN (
    SELECT a.id FROM agendas a
    WHERE a.board_id IN (
      SELECT board_memberships.board_id FROM board_memberships
      WHERE board_memberships.user_id = auth.uid()
    )
  )
);

-- UPDATE: board members can update decisions
CREATE POLICY "Board members can update meeting decisions"
ON public.meeting_decisions FOR UPDATE
USING (
  agenda_id IN (
    SELECT a.id FROM agendas a
    WHERE a.board_id IN (
      SELECT board_memberships.board_id FROM board_memberships
      WHERE board_memberships.user_id = auth.uid()
    )
  )
);

-- DELETE: elevated roles only
CREATE POLICY "Elevated roles can delete meeting decisions"
ON public.meeting_decisions FOR DELETE
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM agendas a
    JOIN boards b ON b.id = a.board_id
    WHERE a.id = meeting_decisions.agenda_id
    AND (
      has_role(auth.uid(), 'org_admin'::app_role, b.org_id)
      OR has_role(auth.uid(), 'chair'::app_role, b.org_id)
    )
  )
);

-- Timestamp trigger
CREATE TRIGGER update_meeting_decisions_updated_at
BEFORE UPDATE ON public.meeting_decisions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();