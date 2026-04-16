
-- Create meeting attendance table
CREATE TABLE IF NOT EXISTS public.meeting_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agenda_id UUID NOT NULL REFERENCES public.agendas(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.board_members(id) ON DELETE CASCADE,
  attended BOOLEAN NOT NULL DEFAULT false,
  apologies TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(agenda_id, member_id)
);

-- Enable RLS
ALTER TABLE public.meeting_attendance ENABLE ROW LEVEL SECURITY;

-- SELECT: board members can view attendance for meetings in their boards
CREATE POLICY "Board members can view attendance"
  ON public.meeting_attendance FOR SELECT
  USING (
    agenda_id IN (
      SELECT a.id FROM agendas a
      WHERE a.board_id IN (
        SELECT board_memberships.board_id FROM board_memberships
        WHERE board_memberships.user_id = auth.uid()
      )
    )
  );

-- INSERT: board members can record attendance for meetings in their boards
CREATE POLICY "Board members can record attendance"
  ON public.meeting_attendance FOR INSERT
  WITH CHECK (
    agenda_id IN (
      SELECT a.id FROM agendas a
      WHERE a.board_id IN (
        SELECT board_memberships.board_id FROM board_memberships
        WHERE board_memberships.user_id = auth.uid()
      )
    )
  );

-- UPDATE: board members can update attendance for meetings in their boards
CREATE POLICY "Board members can update attendance"
  ON public.meeting_attendance FOR UPDATE
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
CREATE POLICY "Elevated roles can delete attendance"
  ON public.meeting_attendance FOR DELETE
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM agendas a
      JOIN boards b ON b.id = a.board_id
      WHERE a.id = meeting_attendance.agenda_id
      AND (has_role(auth.uid(), 'org_admin'::app_role, b.org_id)
        OR has_role(auth.uid(), 'chair'::app_role, b.org_id))
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_meeting_attendance_updated_at
  BEFORE UPDATE ON public.meeting_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
