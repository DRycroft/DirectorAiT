/**
 * Pack Auto-Populate Engine
 *
 * Fills pack sections that have a recognised `section_kind` with structured
 * governance data. Idempotent and safe:
 *   - Skips sections with no section_kind
 *   - Skips sections that already have a human submission (source='human')
 *   - Updates existing 'auto' documents in place (no version inflation)
 *   - Creates a new 'auto' document if none exists
 *   - Writes one audit_log entry: action='pack.auto_populated'
 */

import { supabase } from '@/integrations/supabase/client';
import { fetchGovernanceSnapshot, buildSectionContent } from './packAutoPopulate';

export interface AutoPopulateResult {
  pack_id: string;
  sections_filled: number;
  sections_skipped_human: number;
  sections_skipped_unknown_kind: number;
  sections_total_with_kind: number;
}

export async function autoPopulatePack(packId: string): Promise<AutoPopulateResult> {
  // 1. Load pack
  const { data: pack, error: packErr } = await supabase
    .from('board_packs')
    .select('id, board_id, meeting_date')
    .eq('id', packId)
    .single();
  if (packErr || !pack) throw packErr || new Error('Pack not found');

  // 2. Load sections with kinds
  const { data: sectionsRaw, error: secErr } = await supabase
    .from('pack_sections')
    .select('id, section_kind, status')
    .eq('pack_id', packId);
  if (secErr) throw secErr;
  const kindedSections = (sectionsRaw || []).filter(s => !!s.section_kind);

  if (kindedSections.length === 0) {
    return {
      pack_id: packId,
      sections_filled: 0,
      sections_skipped_human: 0,
      sections_skipped_unknown_kind: 0,
      sections_total_with_kind: 0,
    };
  }

  // 3. Load latest section_documents for these sections (to detect human submissions)
  const sectionIds = kindedSections.map(s => s.id);
  const { data: docsRaw } = await supabase
    .from('section_documents')
    .select('id, section_id, source, version_number')
    .in('section_id', sectionIds)
    .order('version_number', { ascending: false });

  // Map: section_id -> { hasHuman: boolean, autoDocId: string | null, latestVersion: number }
  const sectionDocState = new Map<string, { hasHuman: boolean; autoDocId: string | null; latestVersion: number }>();
  (docsRaw || []).forEach(d => {
    const cur = sectionDocState.get(d.section_id) || { hasHuman: false, autoDocId: null, latestVersion: 0 };
    if (d.source === 'human') cur.hasHuman = true;
    if (d.source === 'auto' && cur.autoDocId === null) cur.autoDocId = d.id;
    if ((d.version_number || 0) > cur.latestVersion) cur.latestVersion = d.version_number || 0;
    sectionDocState.set(d.section_id, cur);
  });

  // 4. Fetch snapshot once
  const snapshot = await fetchGovernanceSnapshot(pack.board_id, pack.meeting_date);

  // 5. Resolve current user (for created_by)
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  if (!userId) throw new Error('Not authenticated');

  let filled = 0;
  let skippedHuman = 0;
  let skippedUnknown = 0;

  for (const section of kindedSections) {
    const kind = section.section_kind as string;
    const content = buildSectionContent(kind, snapshot);
    if (!content) {
      skippedUnknown++;
      continue;
    }
    const state = sectionDocState.get(section.id) || { hasHuman: false, autoDocId: null, latestVersion: 0 };
    if (state.hasHuman) {
      skippedHuman++;
      continue;
    }

    const contentJson = content as unknown as Record<string, never>;
    if (state.autoDocId) {
      // Update existing auto doc in place — no new version
      const { error: updErr } = await supabase
        .from('section_documents')
        .update({ content: contentJson })
        .eq('id', state.autoDocId);
      if (updErr) throw updErr;
    } else {
      const newVersion = (state.latestVersion || 0) + 1;
      const { data: newDoc, error: insErr } = await supabase
        .from('section_documents')
        .insert([{
          section_id: section.id,
          content: contentJson,
          version_number: newVersion,
          created_by: userId,
          source: 'auto',
        }])
        .select('id')
        .single();
      if (insErr) throw insErr;
      // Point pack_section to the new auto doc; keep status compatible with existing UI ('submitted')
      const { error: linkErr } = await supabase
        .from('pack_sections')
        .update({ document_id: newDoc.id, status: 'submitted' })
        .eq('id', section.id);
      if (linkErr) throw linkErr;
    }
    filled++;
  }

  // 6. Audit (best-effort)
  try {
    await supabase.from('audit_log').insert({
      action: 'pack.auto_populated',
      actor_id: userId,
      entity_id: packId,
      entity_type: 'board_pack',
      detail_json: {
        sections_filled: filled,
        sections_skipped_human: skippedHuman,
        sections_skipped_unknown_kind: skippedUnknown,
        sections_total_with_kind: kindedSections.length,
      },
    });
  } catch {
    // audit_log RLS restricts client inserts in some configs — non-fatal
  }

  return {
    pack_id: packId,
    sections_filled: filled,
    sections_skipped_human: skippedHuman,
    sections_skipped_unknown_kind: skippedUnknown,
    sections_total_with_kind: kindedSections.length,
  };
}
