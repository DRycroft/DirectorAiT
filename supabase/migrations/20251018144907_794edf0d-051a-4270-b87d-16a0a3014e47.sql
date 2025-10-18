-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Core Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles table for user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'chair', 'director', 'executive', 'staff', 'observer')),
  mfa_enforced BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Boards table
CREATE TABLE IF NOT EXISTS public.boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Board memberships
CREATE TABLE IF NOT EXISTS public.board_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('chair', 'director', 'observer')),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(board_id, user_id)
);

-- Document snapshots (immutable file storage references)
CREATE TABLE IF NOT EXISTS public.document_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path TEXT NOT NULL,
  checksum_sha256 TEXT NOT NULL,
  filesize BIGINT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  encryption_key_id TEXT
);

-- Archived documents (main document records)
CREATE TABLE IF NOT EXISTS public.archived_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  board_id UUID REFERENCES public.boards(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  snapshot_id UUID NOT NULL REFERENCES public.document_snapshots(id) ON DELETE CASCADE,
  raw_text TEXT,
  parsed_metadata JSONB DEFAULT '{}',
  ocr_language TEXT DEFAULT 'en',
  confidential_level TEXT DEFAULT 'standard' CHECK (confidential_level IN ('public', 'standard', 'confidential', 'restricted')),
  approved BOOLEAN DEFAULT false,
  error_json JSONB,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Extracted decisions from documents
CREATE TABLE IF NOT EXISTS public.extracted_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.archived_documents(id) ON DELETE CASCADE,
  decision_text TEXT NOT NULL,
  decision_date DATE,
  motion_text TEXT,
  proposer TEXT,
  outcome TEXT CHECK (outcome IN ('passed', 'rejected', 'deferred', 'unknown')),
  vote_count JSONB,
  owners JSONB,
  due_date DATE,
  confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  source_page INTEGER,
  source_snippet TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Document embeddings for semantic search
CREATE TABLE IF NOT EXISTS public.document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.archived_documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  chunk_text TEXT NOT NULL,
  embedding vector(768),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(document_id, chunk_index)
);

-- Ingest jobs tracking
CREATE TABLE IF NOT EXISTS public.ingest_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'partially_completed')),
  total_files INTEGER NOT NULL DEFAULT 0,
  completed_files INTEGER NOT NULL DEFAULT 0,
  failed_files INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  log_json JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agendas table
CREATE TABLE IF NOT EXISTS public.agendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  meeting_date TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agenda items
CREATE TABLE IF NOT EXISTS public.agenda_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agenda_id UUID NOT NULL REFERENCES public.agendas(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  item_order INTEGER NOT NULL DEFAULT 0,
  required_reading BOOLEAN DEFAULT false,
  estimated_duration INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Document links (relationships between docs and agenda items/decisions)
CREATE TABLE IF NOT EXISTS public.document_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  src_document_id UUID NOT NULL REFERENCES public.archived_documents(id) ON DELETE CASCADE,
  linked_item_type TEXT NOT NULL CHECK (linked_item_type IN ('agenda_item', 'decision', 'document')),
  linked_item_id UUID NOT NULL,
  similarity_score NUMERIC(3,2) CHECK (similarity_score >= 0 AND similarity_score <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(src_document_id, linked_item_type, linked_item_id)
);

-- Action items
CREATE TABLE IF NOT EXISTS public.action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agenda_item_id UUID REFERENCES public.agenda_items(id) ON DELETE CASCADE,
  extracted_decision_id UUID REFERENCES public.extracted_decisions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  detail_json JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archived_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracted_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingest_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Organizations: Users can only see their own org
CREATE POLICY "Users can view their organization" ON public.organizations
  FOR SELECT USING (
    id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

-- Profiles: Users can view all profiles in their org
CREATE POLICY "Users can view profiles in their org" ON public.profiles
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- Boards: Users can view boards they're members of
CREATE POLICY "Users can view boards they are members of" ON public.boards
  FOR SELECT USING (
    id IN (SELECT board_id FROM public.board_memberships WHERE user_id = auth.uid())
  );

-- Board memberships: Users can view memberships for their boards
CREATE POLICY "Users can view board memberships" ON public.board_memberships
  FOR SELECT USING (
    board_id IN (SELECT board_id FROM public.board_memberships WHERE user_id = auth.uid())
  );

-- Archived documents: Users can view non-confidential docs or docs they have access to
CREATE POLICY "Users can view documents in their org" ON public.archived_documents
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    AND (
      confidential_level IN ('public', 'standard')
      OR uploaded_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin', 'chair')
      )
    )
  );

CREATE POLICY "Users can insert documents" ON public.archived_documents
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    AND uploaded_by = auth.uid()
  );

-- Document snapshots: Linked to documents policy
CREATE POLICY "Users can view document snapshots" ON public.document_snapshots
  FOR SELECT USING (
    id IN (SELECT snapshot_id FROM public.archived_documents WHERE 
      org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Extracted decisions: Follow document access
CREATE POLICY "Users can view extracted decisions" ON public.extracted_decisions
  FOR SELECT USING (
    document_id IN (
      SELECT id FROM public.archived_documents WHERE 
        org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Ingest jobs: Users can view their own jobs
CREATE POLICY "Users can view their ingest jobs" ON public.ingest_jobs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert ingest jobs" ON public.ingest_jobs
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their ingest jobs" ON public.ingest_jobs
  FOR UPDATE USING (user_id = auth.uid());

-- Agendas: Users can view agendas for their boards
CREATE POLICY "Users can view agendas" ON public.agendas
  FOR SELECT USING (
    board_id IN (SELECT board_id FROM public.board_memberships WHERE user_id = auth.uid())
  );

-- Agenda items: Follow agenda access
CREATE POLICY "Users can view agenda items" ON public.agenda_items
  FOR SELECT USING (
    agenda_id IN (
      SELECT id FROM public.agendas WHERE board_id IN (
        SELECT board_id FROM public.board_memberships WHERE user_id = auth.uid()
      )
    )
  );

-- Action items: Users can view action items for their boards
CREATE POLICY "Users can view action items" ON public.action_items
  FOR SELECT USING (
    agenda_item_id IN (
      SELECT ai.id FROM public.agenda_items ai
      JOIN public.agendas a ON ai.agenda_id = a.id
      WHERE a.board_id IN (
        SELECT board_id FROM public.board_memberships WHERE user_id = auth.uid()
      )
    )
    OR owner_id = auth.uid()
  );

-- Audit log: Admins only
CREATE POLICY "Admins can view audit log" ON public.audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Indexes for performance
CREATE INDEX idx_archived_documents_org ON public.archived_documents(org_id);
CREATE INDEX idx_archived_documents_board ON public.archived_documents(board_id);
CREATE INDEX idx_archived_documents_status ON public.archived_documents(processing_status);
CREATE INDEX idx_extracted_decisions_document ON public.extracted_decisions(document_id);
CREATE INDEX idx_document_embeddings_document ON public.document_embeddings(document_id);
CREATE INDEX idx_board_memberships_user ON public.board_memberships(user_id);
CREATE INDEX idx_board_memberships_board ON public.board_memberships(board_id);
CREATE INDEX idx_agendas_board ON public.agendas(board_id);
CREATE INDEX idx_agenda_items_agenda ON public.agenda_items(agenda_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON public.boards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_archived_documents_updated_at BEFORE UPDATE ON public.archived_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agendas_updated_at BEFORE UPDATE ON public.agendas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agenda_items_updated_at BEFORE UPDATE ON public.agenda_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_action_items_updated_at BEFORE UPDATE ON public.action_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, org_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'observer',
    NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();