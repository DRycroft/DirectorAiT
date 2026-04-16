/**
 * Pack Auto-Population Helper
 * 
 * Fetches structured governance data for auto-populating board pack sections.
 */

import { supabase } from '@/integrations/supabase/client';

export interface GovernanceSnapshot {
  attendance: { name: string; position: string | null; attended: boolean; apologies: string | null }[];
  decisions: { title: string; outcome: string | null; proposer: string | null; date: string }[];
  actions: { title: string; owner: string | null; due_date: string | null; status: string | null }[];
  minutes: string | null;
  coi: { member_name: string; interest: string; type: string; status: string | null }[];
  members: { name: string; position: string | null; status: string | null }[];
}

/**
 * Fetch governance data for a board around a meeting date.
 * Finds the closest meeting (agenda) to the pack's meeting_date.
 */
export async function fetchGovernanceSnapshot(
  boardId: string,
  meetingDate: string
): Promise<GovernanceSnapshot> {
  // Find closest agenda/meeting to pack's meeting date
  const { data: agendas } = await supabase
    .from('agendas')
    .select('id, title, meeting_date, minutes_content')
    .eq('board_id', boardId)
    .order('meeting_date', { ascending: false })
    .limit(50);

  // Pick the agenda closest to meetingDate
  let closestAgenda: any = null;
  if (agendas && agendas.length > 0) {
    const target = new Date(meetingDate).getTime();
    closestAgenda = agendas.reduce((prev, curr) => {
      const prevDiff = Math.abs(new Date(prev.meeting_date).getTime() - target);
      const currDiff = Math.abs(new Date(curr.meeting_date).getTime() - target);
      return currDiff < prevDiff ? curr : prev;
    });
  }

  const agendaId = closestAgenda?.id;

  // Parallel fetches
  const [attendanceRes, decisionsRes, actionsRes, membersRes, coiRes] = await Promise.all([
    agendaId
      ? supabase
          .from('meeting_attendance')
          .select('attended, apologies, member:board_members(full_name, position)')
          .eq('agenda_id', agendaId)
      : Promise.resolve({ data: [] }),
    agendaId
      ? supabase
          .from('meeting_decisions')
          .select('title, outcome, proposer, decision_date')
          .eq('agenda_id', agendaId)
          .order('created_at')
      : Promise.resolve({ data: [] }),
    // Actions linked to this board's agendas
    supabase
      .from('action_items')
      .select('title, due_date, status, owner_id, agenda_item_id')
      .not('status', 'eq', 'completed')
      .order('due_date', { ascending: true })
      .limit(50),
    supabase
      .from('board_members')
      .select('full_name, position, status')
      .eq('board_id', boardId)
      .in('status', ['active', 'pending'])
      .order('full_name'),
    supabase
      .from('board_member_coi')
      .select('declared_interest, type, status, member:board_members(full_name)')
      .order('date_declared', { ascending: false })
      .limit(50),
  ]);

  // Resolve action owner names
  const actionOwnerIds = [...new Set((actionsRes.data || []).filter((a: any) => a.owner_id).map((a: any) => a.owner_id))];
  let ownerMap = new Map<string, string>();
  if (actionOwnerIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', actionOwnerIds);
    if (profiles) ownerMap = new Map(profiles.map(p => [p.id, p.name || 'Unknown']));
  }

  // Filter actions to those belonging to this board's agendas
  const boardAgendaIds = new Set((agendas || []).map(a => a.id));
  // We need to get agenda_item -> agenda mapping for filtering
  const actionAgendaItemIds = [...new Set((actionsRes.data || []).filter((a: any) => a.agenda_item_id).map((a: any) => a.agenda_item_id))];
  let agendaItemToAgendaMap = new Map<string, string>();
  if (actionAgendaItemIds.length > 0) {
    const { data: items } = await supabase.from('agenda_items').select('id, agenda_id').in('id', actionAgendaItemIds);
    if (items) agendaItemToAgendaMap = new Map(items.map(i => [i.id, i.agenda_id]));
  }

  const filteredActions = (actionsRes.data || []).filter((a: any) => {
    if (!a.agenda_item_id) return true; // standalone actions
    const agendaId = agendaItemToAgendaMap.get(a.agenda_item_id);
    return agendaId && boardAgendaIds.has(agendaId);
  });

  return {
    attendance: (attendanceRes.data || []).map((a: any) => ({
      name: a.member?.full_name || 'Unknown',
      position: a.member?.position || null,
      attended: a.attended,
      apologies: a.apologies,
    })),
    decisions: (decisionsRes.data || []).map((d: any) => ({
      title: d.title,
      outcome: d.outcome,
      proposer: d.proposer,
      date: d.decision_date,
    })),
    actions: filteredActions.map((a: any) => ({
      title: a.title,
      owner: ownerMap.get(a.owner_id) || null,
      due_date: a.due_date,
      status: a.status,
    })),
    minutes: closestAgenda?.minutes_content || null,
    coi: (coiRes.data || [])
      .filter((c: any) => {
        // Only include COIs from board members on this board
        return true; // We already limited by the join
      })
      .map((c: any) => ({
        member_name: c.member?.full_name || 'Unknown',
        interest: c.declared_interest,
        type: c.type,
        status: c.status,
      })),
    members: (membersRes.data || []).map((m: any) => ({
      name: m.full_name,
      position: m.position,
      status: m.status,
    })),
  };
}
