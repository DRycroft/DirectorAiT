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

interface AgendaRow {
  id: string;
  title: string;
  meeting_date: string;
  minutes_content: string | null;
}

interface AttendanceRow {
  attended: boolean;
  apologies: string | null;
  member: { full_name: string; position: string | null } | null;
}

interface DecisionRow {
  title: string;
  outcome: string | null;
  proposer: string | null;
  decision_date: string;
}

interface ActionRow {
  title: string;
  due_date: string | null;
  status: string | null;
  owner_id: string | null;
  agenda_item_id: string | null;
}

interface MemberRow {
  full_name: string;
  position: string | null;
  status: string | null;
}

interface COIRow {
  declared_interest: string;
  type: string;
  status: string | null;
  member: { full_name: string } | null;
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
  let closestAgenda: AgendaRow | null = null;
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
      : Promise.resolve({ data: [] as AttendanceRow[] }),
    agendaId
      ? supabase
          .from('meeting_decisions')
          .select('title, outcome, proposer, decision_date')
          .eq('agenda_id', agendaId)
          .order('created_at')
      : Promise.resolve({ data: [] as DecisionRow[] }),
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
  const actionData = (actionsRes.data || []) as ActionRow[];
  const actionOwnerIds = [...new Set(actionData.filter(a => a.owner_id).map(a => a.owner_id as string))];
  let ownerMap = new Map<string, string>();
  if (actionOwnerIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', actionOwnerIds);
    if (profiles) ownerMap = new Map(profiles.map(p => [p.id, p.name || 'Unknown']));
  }

  // Filter actions to those belonging to this board's agendas
  const boardAgendaIds = new Set((agendas || []).map(a => a.id));
  const actionAgendaItemIds = [...new Set(actionData.filter(a => a.agenda_item_id).map(a => a.agenda_item_id as string))];
  let agendaItemToAgendaMap = new Map<string, string>();
  if (actionAgendaItemIds.length > 0) {
    const { data: items } = await supabase.from('agenda_items').select('id, agenda_id').in('id', actionAgendaItemIds);
    if (items) agendaItemToAgendaMap = new Map(items.map(i => [i.id, i.agenda_id]));
  }

  const filteredActions = actionData.filter(a => {
    if (!a.agenda_item_id) return true;
    const matchedAgendaId = agendaItemToAgendaMap.get(a.agenda_item_id);
    return matchedAgendaId && boardAgendaIds.has(matchedAgendaId);
  });

  const attendanceData = (attendanceRes.data || []) as AttendanceRow[];
  const decisionsData = (decisionsRes.data || []) as DecisionRow[];
  const membersData = (membersRes.data || []) as MemberRow[];
  const coiData = (coiRes.data || []) as COIRow[];

  return {
    attendance: attendanceData.map(a => ({
      name: a.member?.full_name || 'Unknown',
      position: a.member?.position || null,
      attended: a.attended,
      apologies: a.apologies,
    })),
    decisions: decisionsData.map(d => ({
      title: d.title,
      outcome: d.outcome,
      proposer: d.proposer,
      date: d.decision_date,
    })),
    actions: filteredActions.map(a => ({
      title: a.title,
      owner: a.owner_id ? ownerMap.get(a.owner_id) || null : null,
      due_date: a.due_date,
      status: a.status,
    })),
    minutes: closestAgenda?.minutes_content || null,
    coi: coiData.map(c => ({
      member_name: c.member?.full_name || 'Unknown',
      interest: c.declared_interest,
      type: c.type,
      status: c.status,
    })),
    members: membersData.map(m => ({
      name: m.full_name,
      position: m.position,
      status: m.status,
    })),
  };
}
