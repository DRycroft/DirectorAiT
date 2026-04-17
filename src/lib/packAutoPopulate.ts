/**
 * Pack Auto-Population Helper
 *
 * Fetches structured governance data for auto-populating board pack sections.
 */

import { supabase } from '@/integrations/supabase/client';

export interface GovernanceSnapshot {
  attendance: { name: string; position: string | null; attended: boolean; apologies: string | null }[];
  decisions: { title: string; outcome: string | null; proposer: string | null; date: string; linked_action_titles?: string[] }[];
  actions: { title: string; owner: string | null; due_date: string | null; status: string | null; linked_decision_title?: string | null }[];
  minutes: string | null;
  prior_minutes: { meeting_date: string; title: string; content: string } | null;
  coi: { member_name: string; interest: string; type: string; status: string | null }[];
  members: { name: string; position: string | null; status: string | null; member_type: string | null }[];
  meta: { board_id: string; meeting_date: string; matched_agenda_id: string | null; matched_agenda_date: string | null };
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
  id?: string;
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
  extracted_decision_id: string | null;
}

interface MemberRow {
  id: string;
  full_name: string;
  position: string | null;
  status: string | null;
  member_type: string | null;
}

interface COIRow {
  declared_interest: string;
  type: string;
  status: string | null;
  member: { full_name: string; board_id: string } | null;
}

/**
 * Fetch governance data for a board around a meeting date.
 * Finds the closest meeting (agenda) to the pack's meeting_date.
 */
export async function fetchGovernanceSnapshot(
  boardId: string,
  meetingDate: string
): Promise<GovernanceSnapshot> {
  // Load recent agendas for closest-match + prior-minutes lookup
  const { data: agendas } = await supabase
    .from('agendas')
    .select('id, title, meeting_date, minutes_content')
    .eq('board_id', boardId)
    .order('meeting_date', { ascending: false })
    .limit(50);

  let closestAgenda: AgendaRow | null = null;
  let priorAgenda: AgendaRow | null = null;
  if (agendas && agendas.length > 0) {
    const target = new Date(meetingDate).getTime();
    closestAgenda = agendas.reduce((prev, curr) => {
      const prevDiff = Math.abs(new Date(prev.meeting_date).getTime() - target);
      const currDiff = Math.abs(new Date(curr.meeting_date).getTime() - target);
      return currDiff < prevDiff ? curr : prev;
    });

    // Prior minutes: most recent agenda strictly before closestAgenda's meeting_date with content
    if (closestAgenda) {
      const closestTs = new Date(closestAgenda.meeting_date).getTime();
      priorAgenda = agendas
        .filter(a => a.id !== closestAgenda!.id && new Date(a.meeting_date).getTime() < closestTs && a.minutes_content && a.minutes_content.trim().length > 0)
        .sort((a, b) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime())[0] || null;
    }
  }

  const agendaId = closestAgenda?.id;

  // Board members (for COI scoping + members slice). Active only for snapshot use.
  const { data: boardMembersRaw } = await supabase
    .from('board_members')
    .select('id, full_name, position, status, member_type')
    .eq('board_id', boardId)
    .eq('status', 'active')
    .order('full_name');
  const boardMembers = (boardMembersRaw || []) as MemberRow[];
  const boardMemberIds = boardMembers.map(m => m.id);

  // Parallel fetches
  const [attendanceRes, decisionsRes, actionsRes, coiRes] = await Promise.all([
    agendaId
      ? supabase
          .from('meeting_attendance')
          .select('attended, apologies, member:board_members(full_name, position)')
          .eq('agenda_id', agendaId)
      : Promise.resolve({ data: [] as AttendanceRow[] }),
    agendaId
      ? supabase
          .from('meeting_decisions')
          .select('id, title, outcome, proposer, decision_date')
          .eq('agenda_id', agendaId)
          .order('created_at')
      : Promise.resolve({ data: [] as DecisionRow[] }),
    supabase
      .from('action_items')
      .select('title, due_date, status, owner_id, agenda_item_id, extracted_decision_id')
      .not('status', 'in', '("completed","cancelled","closed")')
      .order('due_date', { ascending: true })
      .limit(100),
    boardMemberIds.length > 0
      ? supabase
          .from('board_member_coi')
          .select('declared_interest, type, status, member:board_members(full_name, board_id)')
          .eq('status', 'active')
          .in('member_id', boardMemberIds)
          .order('date_declared', { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [] as COIRow[] }),
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
    if (!a.agenda_item_id) return false; // require board-scoped linkage
    const matchedAgendaId = agendaItemToAgendaMap.get(a.agenda_item_id);
    return matchedAgendaId && boardAgendaIds.has(matchedAgendaId);
  });

  // Decision <-> action cross-pollination
  const decisionsData = (decisionsRes.data || []) as DecisionRow[];
  const decisionIdToTitle = new Map<string, string>();
  decisionsData.forEach(d => { if (d.id) decisionIdToTitle.set(d.id, d.title); });
  const decisionIdToActionTitles = new Map<string, string[]>();
  filteredActions.forEach(a => {
    if (a.extracted_decision_id) {
      const arr = decisionIdToActionTitles.get(a.extracted_decision_id) || [];
      arr.push(a.title);
      decisionIdToActionTitles.set(a.extracted_decision_id, arr);
    }
  });

  const attendanceData = (attendanceRes.data || []) as AttendanceRow[];
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
      linked_action_titles: d.id ? decisionIdToActionTitles.get(d.id) || [] : [],
    })),
    actions: filteredActions.map(a => ({
      title: a.title,
      owner: a.owner_id ? ownerMap.get(a.owner_id) || null : null,
      due_date: a.due_date,
      status: a.status,
      linked_decision_title: a.extracted_decision_id ? decisionIdToTitle.get(a.extracted_decision_id) || null : null,
    })),
    minutes: closestAgenda?.minutes_content || null,
    prior_minutes: priorAgenda
      ? { meeting_date: priorAgenda.meeting_date, title: priorAgenda.title, content: priorAgenda.minutes_content || '' }
      : null,
    coi: coiData.map(c => ({
      member_name: c.member?.full_name || 'Unknown',
      interest: c.declared_interest,
      type: c.type,
      status: c.status,
    })),
    members: boardMembers.map(m => ({
      name: m.full_name,
      position: m.position,
      status: m.status,
      member_type: m.member_type,
    })),
    meta: {
      board_id: boardId,
      meeting_date: meetingDate,
      matched_agenda_id: closestAgenda?.id || null,
      matched_agenda_date: closestAgenda?.meeting_date || null,
    },
  };
}

/**
 * Recognised section_kind values that the auto-populate engine knows how to fill.
 */
export const KNOWN_SECTION_KINDS = [
  'attendance',
  'prior_minutes',
  'coi_register',
  'actions_log',
  'decisions_log',
  'members_directory',
] as const;
export type SectionKind = typeof KNOWN_SECTION_KINDS[number];

/**
 * Build the JSON content payload for a given section_kind from a snapshot.
 * Returns null if the kind is unknown — caller should skip.
 */
export function buildSectionContent(kind: string, snapshot: GovernanceSnapshot): Record<string, unknown> | null {
  switch (kind) {
    case 'attendance':
      return {
        kind,
        generated_at: new Date().toISOString(),
        meeting_date: snapshot.meta.matched_agenda_date,
        rows: snapshot.attendance,
      };
    case 'prior_minutes':
      return {
        kind,
        generated_at: new Date().toISOString(),
        prior_minutes: snapshot.prior_minutes,
      };
    case 'coi_register':
      return {
        kind,
        generated_at: new Date().toISOString(),
        rows: snapshot.coi,
      };
    case 'actions_log':
      return {
        kind,
        generated_at: new Date().toISOString(),
        rows: snapshot.actions,
      };
    case 'decisions_log':
      return {
        kind,
        generated_at: new Date().toISOString(),
        meeting_date: snapshot.meta.matched_agenda_date,
        rows: snapshot.decisions,
      };
    case 'members_directory':
      return {
        kind,
        generated_at: new Date().toISOString(),
        rows: snapshot.members,
      };
    default:
      return null;
  }
}
