-- Phase 1: Board Papers MVP Database Schema

-- Create board_templates table (stores reusable templates)
CREATE TABLE IF NOT EXISTS public.board_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create template_sections table (sections within a template)
CREATE TABLE IF NOT EXISTS public.template_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.board_templates(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN DEFAULT false,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create board_packs table (meeting packs)
CREATE TABLE IF NOT EXISTS public.board_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES public.board_templates(id) ON DELETE SET NULL,
  meeting_date DATE NOT NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create pack_sections table (sections in a specific pack)
CREATE TABLE IF NOT EXISTS public.pack_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID REFERENCES public.board_packs(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  document_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create section_documents table (actual content for sections)
CREATE TABLE IF NOT EXISTS public.section_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES public.pack_sections(id) ON DELETE CASCADE NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  version_number INTEGER DEFAULT 1,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add self-referencing FK for document_id in pack_sections
ALTER TABLE public.pack_sections 
ADD CONSTRAINT pack_sections_document_id_fkey 
FOREIGN KEY (document_id) REFERENCES public.section_documents(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.board_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pack_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for board_templates
CREATE POLICY "Users can view templates in their org"
  ON public.board_templates FOR SELECT
  USING (
    board_id IN (
      SELECT b.id FROM public.boards b
      WHERE b.org_id IN (
        SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create templates"
  ON public.board_templates FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    board_id IN (
      SELECT b.id FROM public.boards b
      WHERE b.org_id IN (
        SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update templates in their org"
  ON public.board_templates FOR UPDATE
  USING (
    board_id IN (
      SELECT b.id FROM public.boards b
      WHERE b.org_id IN (
        SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete templates in their org"
  ON public.board_templates FOR DELETE
  USING (
    board_id IN (
      SELECT b.id FROM public.boards b
      WHERE b.org_id IN (
        SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
      )
    )
  );

-- RLS Policies for template_sections
CREATE POLICY "Users can view template sections in their org"
  ON public.template_sections FOR SELECT
  USING (
    template_id IN (
      SELECT bt.id FROM public.board_templates bt
      JOIN public.boards b ON bt.board_id = b.id
      WHERE b.org_id IN (
        SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage template sections"
  ON public.template_sections FOR ALL
  USING (
    template_id IN (
      SELECT bt.id FROM public.board_templates bt
      JOIN public.boards b ON bt.board_id = b.id
      WHERE b.org_id IN (
        SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
      )
    )
  );

-- RLS Policies for board_packs
CREATE POLICY "Users can view packs in their org"
  ON public.board_packs FOR SELECT
  USING (
    board_id IN (
      SELECT b.id FROM public.boards b
      WHERE b.org_id IN (
        SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create packs"
  ON public.board_packs FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    board_id IN (
      SELECT b.id FROM public.boards b
      WHERE b.org_id IN (
        SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update packs in their org"
  ON public.board_packs FOR UPDATE
  USING (
    board_id IN (
      SELECT b.id FROM public.boards b
      WHERE b.org_id IN (
        SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete packs in their org"
  ON public.board_packs FOR DELETE
  USING (
    board_id IN (
      SELECT b.id FROM public.boards b
      WHERE b.org_id IN (
        SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
      )
    )
  );

-- RLS Policies for pack_sections
CREATE POLICY "Users can view pack sections in their org"
  ON public.pack_sections FOR SELECT
  USING (
    pack_id IN (
      SELECT bp.id FROM public.board_packs bp
      JOIN public.boards b ON bp.board_id = b.id
      WHERE b.org_id IN (
        SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage pack sections"
  ON public.pack_sections FOR ALL
  USING (
    pack_id IN (
      SELECT bp.id FROM public.board_packs bp
      JOIN public.boards b ON bp.board_id = b.id
      WHERE b.org_id IN (
        SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
      )
    )
  );

-- RLS Policies for section_documents
CREATE POLICY "Users can view section documents in their org"
  ON public.section_documents FOR SELECT
  USING (
    section_id IN (
      SELECT ps.id FROM public.pack_sections ps
      JOIN public.board_packs bp ON ps.pack_id = bp.id
      JOIN public.boards b ON bp.board_id = b.id
      WHERE b.org_id IN (
        SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create section documents"
  ON public.section_documents FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    section_id IN (
      SELECT ps.id FROM public.pack_sections ps
      JOIN public.board_packs bp ON ps.pack_id = bp.id
      JOIN public.boards b ON bp.board_id = b.id
      WHERE b.org_id IN (
        SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update section documents"
  ON public.section_documents FOR UPDATE
  USING (
    section_id IN (
      SELECT ps.id FROM public.pack_sections ps
      JOIN public.board_packs bp ON ps.pack_id = bp.id
      JOIN public.boards b ON bp.board_id = b.id
      WHERE b.org_id IN (
        SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid()
      )
    )
  );

-- Create indexes for performance
CREATE INDEX idx_template_sections_template_id ON public.template_sections(template_id);
CREATE INDEX idx_template_sections_order ON public.template_sections(order_index);
CREATE INDEX idx_pack_sections_pack_id ON public.pack_sections(pack_id);
CREATE INDEX idx_pack_sections_order ON public.pack_sections(order_index);
CREATE INDEX idx_section_documents_section_id ON public.section_documents(section_id);
CREATE INDEX idx_board_packs_board_id ON public.board_packs(board_id);
CREATE INDEX idx_board_packs_meeting_date ON public.board_packs(meeting_date);

-- Create trigger for updated_at (reuse existing function)
CREATE TRIGGER update_board_templates_updated_at BEFORE UPDATE ON public.board_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_sections_updated_at BEFORE UPDATE ON public.template_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_board_packs_updated_at BEFORE UPDATE ON public.board_packs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pack_sections_updated_at BEFORE UPDATE ON public.pack_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_section_documents_updated_at BEFORE UPDATE ON public.section_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();