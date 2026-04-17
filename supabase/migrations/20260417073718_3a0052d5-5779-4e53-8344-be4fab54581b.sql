-- Phase 1A: Pack Auto-Assembly engine — additive schema only
ALTER TABLE public.template_sections
  ADD COLUMN IF NOT EXISTS section_kind text;

ALTER TABLE public.pack_sections
  ADD COLUMN IF NOT EXISTS section_kind text;

ALTER TABLE public.section_documents
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'human';

CREATE INDEX IF NOT EXISTS idx_pack_sections_section_kind
  ON public.pack_sections(section_kind) WHERE section_kind IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_template_sections_section_kind
  ON public.template_sections(section_kind) WHERE section_kind IS NOT NULL;