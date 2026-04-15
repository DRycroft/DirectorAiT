
-- =====================
-- AGENDAS: INSERT / UPDATE / DELETE
-- =====================

-- Board members can create meetings for their boards
CREATE POLICY "Board members can create agendas"
ON public.agendas FOR INSERT TO public
WITH CHECK (
  board_id IN (
    SELECT board_id FROM board_memberships WHERE user_id = auth.uid()
  )
);

-- Board members can update agendas for their boards
CREATE POLICY "Board members can update agendas"
ON public.agendas FOR UPDATE TO public
USING (
  board_id IN (
    SELECT board_id FROM board_memberships WHERE user_id = auth.uid()
  )
);

-- Elevated roles can delete agendas
CREATE POLICY "Elevated roles can delete agendas"
ON public.agendas FOR DELETE TO public
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM boards b
    WHERE b.id = agendas.board_id
    AND (
      has_role(auth.uid(), 'org_admin'::app_role, b.org_id)
      OR has_role(auth.uid(), 'chair'::app_role, b.org_id)
    )
  )
);

-- =====================
-- AGENDA_ITEMS: INSERT / UPDATE / DELETE
-- =====================

-- Board members can create agenda items for agendas they can access
CREATE POLICY "Board members can create agenda items"
ON public.agenda_items FOR INSERT TO public
WITH CHECK (
  agenda_id IN (
    SELECT a.id FROM agendas a
    WHERE a.board_id IN (
      SELECT board_id FROM board_memberships WHERE user_id = auth.uid()
    )
  )
);

-- Board members can update agenda items
CREATE POLICY "Board members can update agenda items"
ON public.agenda_items FOR UPDATE TO public
USING (
  agenda_id IN (
    SELECT a.id FROM agendas a
    WHERE a.board_id IN (
      SELECT board_id FROM board_memberships WHERE user_id = auth.uid()
    )
  )
);

-- Elevated roles can delete agenda items
CREATE POLICY "Elevated roles can delete agenda items"
ON public.agenda_items FOR DELETE TO public
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM agendas a
    JOIN boards b ON b.id = a.board_id
    WHERE a.id = agenda_items.agenda_id
    AND (
      has_role(auth.uid(), 'org_admin'::app_role, b.org_id)
      OR has_role(auth.uid(), 'chair'::app_role, b.org_id)
    )
  )
);

-- =====================
-- ACTION_ITEMS: INSERT / UPDATE / DELETE
-- =====================

-- Board members can create action items linked to their board's agenda items
CREATE POLICY "Board members can create action items"
ON public.action_items FOR INSERT TO public
WITH CHECK (
  agenda_item_id IN (
    SELECT ai.id FROM agenda_items ai
    JOIN agendas a ON a.id = ai.agenda_id
    WHERE a.board_id IN (
      SELECT board_id FROM board_memberships WHERE user_id = auth.uid()
    )
  )
);

-- Action owners can update their own items; elevated roles can update any in their org
CREATE POLICY "Owners and elevated roles can update action items"
ON public.action_items FOR UPDATE TO public
USING (
  owner_id = auth.uid()
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM agenda_items ai
    JOIN agendas a ON a.id = ai.agenda_id
    JOIN boards b ON b.id = a.board_id
    WHERE ai.id = action_items.agenda_item_id
    AND (
      has_role(auth.uid(), 'org_admin'::app_role, b.org_id)
      OR has_role(auth.uid(), 'chair'::app_role, b.org_id)
    )
  )
);

-- Elevated roles can delete action items
CREATE POLICY "Elevated roles can delete action items"
ON public.action_items FOR DELETE TO public
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM agenda_items ai
    JOIN agendas a ON a.id = ai.agenda_id
    JOIN boards b ON b.id = a.board_id
    WHERE ai.id = action_items.agenda_item_id
    AND (
      has_role(auth.uid(), 'org_admin'::app_role, b.org_id)
      OR has_role(auth.uid(), 'chair'::app_role, b.org_id)
    )
  )
);
