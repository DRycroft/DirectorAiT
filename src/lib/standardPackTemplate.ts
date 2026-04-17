/**
 * Standard Board Pack template definition.
 * Sections + section_kind values aligned with autoPopulatePack engine.
 */

export const STANDARD_TEMPLATE_NAME = 'Standard Board Pack';
export const STANDARD_TEMPLATE_DESCRIPTION =
  'Default board pack structure with auto-fill enabled for governance data sections.';

export interface StandardSection {
  title: string;
  order_index: number;
  is_required: boolean;
  is_enabled: boolean;
  section_kind: string | null;
}

export const STANDARD_SECTIONS: StandardSection[] = [
  { title: 'Cover Page',                            order_index: 0,  is_required: true,  is_enabled: true, section_kind: null },
  { title: 'Agenda',                                order_index: 1,  is_required: true,  is_enabled: true, section_kind: null },
  { title: 'Attendance & Apologies',                order_index: 2,  is_required: true,  is_enabled: true, section_kind: 'attendance' },
  { title: 'Conflicts of Interest',                 order_index: 3,  is_required: true,  is_enabled: true, section_kind: 'coi_register' },
  { title: 'Minutes of Previous Meeting',           order_index: 4,  is_required: true,  is_enabled: true, section_kind: 'prior_minutes' },
  { title: 'Action Items Review',                   order_index: 5,  is_required: true,  is_enabled: true, section_kind: 'actions_log' },
  { title: 'Prior Decisions Log',                   order_index: 6,  is_required: false, is_enabled: true, section_kind: 'decisions_log' },
  { title: 'Board Members Directory',               order_index: 7,  is_required: false, is_enabled: true, section_kind: 'members_directory' },
  { title: 'Chair Report',                          order_index: 8,  is_required: false, is_enabled: true, section_kind: null },
  { title: 'CEO Report',                            order_index: 9,  is_required: false, is_enabled: true, section_kind: null },
  { title: 'CFO Report',                            order_index: 10, is_required: false, is_enabled: true, section_kind: null },
  { title: 'Compliance Report',                     order_index: 11, is_required: false, is_enabled: true, section_kind: null },
  { title: 'Health & Safety Report',                order_index: 12, is_required: false, is_enabled: true, section_kind: null },
  { title: 'Risk Register',                         order_index: 13, is_required: false, is_enabled: true, section_kind: null },
  { title: 'Strategic Items / Papers for Decision', order_index: 14, is_required: false, is_enabled: true, section_kind: null },
  { title: 'General Business',                      order_index: 15, is_required: false, is_enabled: true, section_kind: null },
  { title: 'Closing & Next Meeting',                order_index: 16, is_required: true,  is_enabled: true, section_kind: null },
];
