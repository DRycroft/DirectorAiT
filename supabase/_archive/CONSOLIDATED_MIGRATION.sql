-- DO NOT APPLY IN PROD OR STAGING.
-- Consolidated script kept for reference only; use timestamped migrations under /supabase/migrations.

-- Consolidated Lovable -> Supabase migrations (idempotent drop+create)
-- Generated on: 2025-11-01 13:37:09Z
-- Caution: Run in staging first. This script will DROP policies and triggers if they exist.

-- 0) Safety: set search_path for clarity
SET search_path = public, storage, pg_catalog;

-- 1) Ensure required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS vector;

-- 2) Generic cleanup placeholders (add more names if you want explicit global drops)
-- NOTE: The script also adds per-migration DROP statements before each CREATE POLICY/CREATE TRIGGER.
-- Add any additional known policy/trigger names you want dropped globally below:
-- Example:
-- ALTER TABLE public.organizations DROP POLICY IF EXISTS "Users can view their org";
-- DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;

-- 3) Ensure storage bucket exists (safe insert)
INSERT INTO storage.buckets (id, name, public)
VALUES ('board-documents', 'board-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 4) Begin migrations (files concatenated below)

-- ----------------------------------------------------------------
-- Migration file: 20251018144907_794edf0d-051a-4270-b87d-16a0a3014e47.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251018144907_794edf0d-051a-4270-b87d-16a0a3014e47.sql
-- ----------------------------------------------------------------
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

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view their organization" ON public.organizations;
DROP POLICY IF EXISTS "Users can view profiles in their org" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view boards they are members of" ON public.boards;
DROP POLICY IF EXISTS "Users can view board memberships" ON public.board_memberships;
DROP POLICY IF EXISTS "Users can view documents in their org" ON public.archived_documents;
DROP POLICY IF EXISTS "Users can insert documents" ON public.archived_documents;
DROP POLICY IF EXISTS "Users can view document snapshots" ON public.document_snapshots;
DROP POLICY IF EXISTS "Users can view extracted decisions" ON public.extracted_decisions;
DROP POLICY IF EXISTS "Users can view their ingest jobs" ON public.ingest_jobs;
DROP POLICY IF EXISTS "Users can insert ingest jobs" ON public.ingest_jobs;
DROP POLICY IF EXISTS "Users can update their ingest jobs" ON public.ingest_jobs;
DROP POLICY IF EXISTS "Users can view agendas" ON public.agendas;
DROP POLICY IF EXISTS "Users can view agenda items" ON public.agenda_items;
DROP POLICY IF EXISTS "Users can view action items" ON public.action_items;
DROP POLICY IF EXISTS "Admins can view audit log" ON public.audit_log;

-- Organizations: Users can only see their own org
ALTER TABLE public.organizations DROP POLICY IF EXISTS "Users can view their organization";
CREATE POLICY "Users can view their organization" ON public.organizations
  FOR SELECT USING (
    id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

-- Profiles: Users can view all profiles in their org
ALTER TABLE public.profiles DROP POLICY IF EXISTS "Users can view profiles in their org";
CREATE POLICY "Users can view profiles in their org" ON public.profiles
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

ALTER TABLE public.profiles DROP POLICY IF EXISTS "Users can update their own profile";
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- Boards: Users can view boards they're members of
ALTER TABLE public.boards DROP POLICY IF EXISTS "Users can view boards they are members of";
CREATE POLICY "Users can view boards they are members of" ON public.boards
  FOR SELECT USING (
    id IN (SELECT board_id FROM public.board_memberships WHERE user_id = auth.uid())
  );

-- Board memberships: Users can view memberships for their boards
ALTER TABLE public.board_memberships DROP POLICY IF EXISTS "Users can view board memberships";
CREATE POLICY "Users can view board memberships" ON public.board_memberships
  FOR SELECT USING (
    board_id IN (SELECT board_id FROM public.board_memberships WHERE user_id = auth.uid())
  );

-- Archived documents: Users can view non-confidential docs or docs they have access to
ALTER TABLE public.archived_documents DROP POLICY IF EXISTS "Users can view documents in their org";
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

ALTER TABLE public.archived_documents DROP POLICY IF EXISTS "Users can insert documents";
CREATE POLICY "Users can insert documents" ON public.archived_documents
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    AND uploaded_by = auth.uid()
  );

-- Document snapshots: Linked to documents policy
ALTER TABLE public.document_snapshots DROP POLICY IF EXISTS "Users can view document snapshots";
CREATE POLICY "Users can view document snapshots" ON public.document_snapshots
  FOR SELECT USING (
    id IN (SELECT snapshot_id FROM public.archived_documents WHERE 
      org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Extracted decisions: Follow document access
ALTER TABLE public.extracted_decisions DROP POLICY IF EXISTS "Users can view extracted decisions";
CREATE POLICY "Users can view extracted decisions" ON public.extracted_decisions
  FOR SELECT USING (
    document_id IN (
      SELECT id FROM public.archived_documents WHERE 
        org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Ingest jobs: Users can view their own jobs
ALTER TABLE public.ingest_jobs DROP POLICY IF EXISTS "Users can view their ingest jobs";
CREATE POLICY "Users can view their ingest jobs" ON public.ingest_jobs
  FOR SELECT USING (user_id = auth.uid());

ALTER TABLE public.ingest_jobs DROP POLICY IF EXISTS "Users can insert ingest jobs";
CREATE POLICY "Users can insert ingest jobs" ON public.ingest_jobs
  FOR INSERT WITH CHECK (user_id = auth.uid());

ALTER TABLE public.ingest_jobs DROP POLICY IF EXISTS "Users can update their ingest jobs";
CREATE POLICY "Users can update their ingest jobs" ON public.ingest_jobs
  FOR UPDATE USING (user_id = auth.uid());

-- Agendas: Users can view agendas for their boards
ALTER TABLE public.agendas DROP POLICY IF EXISTS "Users can view agendas";
CREATE POLICY "Users can view agendas" ON public.agendas
  FOR SELECT USING (
    board_id IN (SELECT board_id FROM public.board_memberships WHERE user_id = auth.uid())
  );

-- Agenda items: Follow agenda access
ALTER TABLE public.agenda_items DROP POLICY IF EXISTS "Users can view agenda items";
CREATE POLICY "Users can view agenda items" ON public.agenda_items
  FOR SELECT USING (
    agenda_id IN (
      SELECT id FROM public.agendas WHERE board_id IN (
        SELECT board_id FROM public.board_memberships WHERE user_id = auth.uid()
      )
    )
  );

-- Action items: Users can view action items for their boards
ALTER TABLE public.action_items DROP POLICY IF EXISTS "Users can view action items";
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
ALTER TABLE public.audit_log DROP POLICY IF EXISTS "Admins can view audit log";
CREATE POLICY "Admins can view audit log" ON public.audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_archived_documents_org ON public.archived_documents(org_id);
CREATE INDEX IF NOT EXISTS idx_archived_documents_board ON public.archived_documents(board_id);
CREATE INDEX IF NOT EXISTS idx_archived_documents_status ON public.archived_documents(processing_status);
CREATE INDEX IF NOT EXISTS idx_extracted_decisions_document ON public.extracted_decisions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_embeddings_document ON public.document_embeddings(document_id);
CREATE INDEX IF NOT EXISTS idx_board_memberships_user ON public.board_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_board_memberships_board ON public.board_memberships(board_id);
CREATE INDEX IF NOT EXISTS idx_agendas_board ON public.agendas(board_id);
CREATE INDEX IF NOT EXISTS idx_agenda_items_agenda ON public.agenda_items(agenda_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_boards_updated_at ON public.boards;
DROP TRIGGER IF EXISTS update_boards_updated_at ON public.boards;
CREATE TRIGGER update_boards_updated_at BEFORE UPDATE ON public.boards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_archived_documents_updated_at ON public.archived_documents;
DROP TRIGGER IF EXISTS update_archived_documents_updated_at ON public.archived_documents;
CREATE TRIGGER update_archived_documents_updated_at BEFORE UPDATE ON public.archived_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_agendas_updated_at ON public.agendas;
DROP TRIGGER IF EXISTS update_agendas_updated_at ON public.agendas;
CREATE TRIGGER update_agendas_updated_at BEFORE UPDATE ON public.agendas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_agenda_items_updated_at ON public.agenda_items;
DROP TRIGGER IF EXISTS update_agenda_items_updated_at ON public.agenda_items;
CREATE TRIGGER update_agenda_items_updated_at BEFORE UPDATE ON public.agenda_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_action_items_updated_at ON public.action_items;
DROP TRIGGER IF EXISTS update_action_items_updated_at ON public.action_items;
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------
-- Migration file: 20251018145015_22d37d51-a2c3-47f6-a1ab-d09908f24446.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251018145015_22d37d51-a2c3-47f6-a1ab-d09908f24446.sql
-- ----------------------------------------------------------------
-- Fix security warnings without dropping function

-- Add missing RLS policies for document_snapshots
ALTER TABLE public.document_snapshots DROP POLICY IF EXISTS "Users can insert document snapshots";
CREATE POLICY "Users can insert document snapshots" ON public.document_snapshots
  FOR INSERT WITH CHECK (true);

-- Add missing RLS policies for document_links  
ALTER TABLE public.document_links DROP POLICY IF EXISTS "Users can view document links";
CREATE POLICY "Users can view document links" ON public.document_links
  FOR SELECT USING (
    src_document_id IN (
      SELECT id FROM public.archived_documents WHERE 
        org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
  );

ALTER TABLE public.document_links DROP POLICY IF EXISTS "System can create document links";
CREATE POLICY "System can create document links" ON public.document_links
  FOR INSERT WITH CHECK (true);

-- Fix function search_path by recreating it properly
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add RLS policy for document_embeddings
ALTER TABLE public.document_embeddings DROP POLICY IF EXISTS "System can create embeddings";
CREATE POLICY "System can create embeddings" ON public.document_embeddings
  FOR INSERT WITH CHECK (true);

ALTER TABLE public.document_embeddings DROP POLICY IF EXISTS "Users can view embeddings";
CREATE POLICY "Users can view embeddings" ON public.document_embeddings
  FOR SELECT USING (
    document_id IN (
      SELECT id FROM public.archived_documents WHERE 
        org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Add audit log insert policy
ALTER TABLE public.audit_log DROP POLICY IF EXISTS "System can create audit logs";
CREATE POLICY "System can create audit logs" ON public.audit_log
  FOR INSERT WITH CHECK (true);

-- ----------------------------------------------------------------
-- Migration file: 20251018145139_5920d566-c196-4b30-8197-1151b4b2da5e.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251018145139_5920d566-c196-4b30-8197-1151b4b2da5e.sql
-- ----------------------------------------------------------------
-- Create storage bucket for board documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'board-documents',
  'board-documents',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain', 'image/png', 'image/jpeg']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for documents
ALTER TABLE storage.objects DROP POLICY IF EXISTS "Users can upload documents to their org";
CREATE POLICY "Users can upload documents to their org"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'board-documents'
);

ALTER TABLE storage.objects DROP POLICY IF EXISTS "Users can view documents in their org";
CREATE POLICY "Users can view documents in their org"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'board-documents'
);

ALTER TABLE storage.objects DROP POLICY IF EXISTS "Users can delete their uploaded documents";
CREATE POLICY "Users can delete their uploaded documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'board-documents' AND
  owner = auth.uid()
);

-- ----------------------------------------------------------------
-- Migration file: 20251018151843_7d082366-466a-48e0-87ae-89de550cff5b.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251018151843_7d082366-466a-48e0-87ae-89de550cff5b.sql
-- ----------------------------------------------------------------
-- SECURE GOVERNANCE FRAMEWORK - STAGE 1
-- Roles, board settings, role helper, submissions, audit trigger

-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM (
  'super_admin',
  'org_admin', 
  'chair',
  'director',
  'executive',
  'staff',
  'observer',
  'external_guest'
);

-- 2. Create user_roles junction table (SECURE - prevents privilege escalation)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function (bypasses RLS, prevents recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- 4. Migrate existing profile.role data to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::app_role 
FROM public.profiles 
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Create roles metadata table (for UI display)
CREATE TABLE IF NOT EXISTS public.roles (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.roles (id, display_name, description) VALUES
  ('super_admin', 'Super Admin', 'Platform operators'),
  ('org_admin', 'Org Admin', 'Organization administrator'),
  ('chair', 'Chair', 'Board chair'),
  ('director', 'Director', 'Board member with voting rights'),
  ('executive', 'Executive', 'CEO/C-suite executives'),
  ('staff', 'Staff', 'Frontline staff'),
  ('observer', 'Observer', 'Read-only access'),
  ('external_guest', 'External Guest', 'Time-limited access')
ON CONFLICT (id) DO NOTHING;

-- 6. Create board_settings
CREATE TABLE IF NOT EXISTS public.board_settings (
  board_id UUID PRIMARY KEY REFERENCES public.boards(id) ON DELETE CASCADE,
  quorum_percent INTEGER DEFAULT 50 CHECK (quorum_percent > 0 AND quorum_percent <= 100),
  vote_threshold INTEGER DEFAULT 50 CHECK (vote_threshold > 0 AND vote_threshold <= 100),
  supermajority_threshold INTEGER DEFAULT 66 CHECK (supermajority_threshold > 0 AND supermajority_threshold <= 100),
  silent_vote_window INTEGER DEFAULT 48 CHECK (silent_vote_window > 0),
  reveal_policy TEXT DEFAULT 'chair_controlled' CHECK (reveal_policy IN ('chair_controlled', 'immediate', 'after_quorum')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.board_settings ENABLE ROW LEVEL SECURITY;

-- 7. Create board_role_overrides (board-specific role assignments)
CREATE TABLE IF NOT EXISTS public.board_role_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES public.roles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(board_id, profile_id, role_id)
);

ALTER TABLE public.board_role_overrides ENABLE ROW LEVEL SECURITY;

-- 8. Create document_submissions
CREATE TABLE IF NOT EXISTS public.document_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.archived_documents(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ
);

ALTER TABLE public.document_submissions ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES

-- user_roles: Only admins can view/manage
ALTER TABLE public.user_roles DROP POLICY IF EXISTS "Admins can view all user roles";
CREATE POLICY "Admins can view all user roles" ON public.user_roles
  FOR SELECT USING (
    public.has_role(auth.uid(), 'super_admin'::app_role) OR 
    public.has_role(auth.uid(), 'org_admin'::app_role)
  );

ALTER TABLE public.user_roles DROP POLICY IF EXISTS "Admins can manage user roles";
CREATE POLICY "Admins can manage user roles" ON public.user_roles
  FOR ALL USING (
    public.has_role(auth.uid(), 'super_admin'::app_role) OR 
    public.has_role(auth.uid(), 'org_admin'::app_role)
  );

-- board_settings: Board members can view, admins/chair can update
ALTER TABLE public.board_settings DROP POLICY IF EXISTS "Board members can view settings";
CREATE POLICY "Board members can view settings" ON public.board_settings
  FOR SELECT USING (
    board_id IN (
      SELECT board_id FROM public.board_memberships WHERE user_id = auth.uid()
    )
  );

ALTER TABLE public.board_settings DROP POLICY IF EXISTS "Admins and chairs can update settings";
CREATE POLICY "Admins and chairs can update settings" ON public.board_settings
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'chair'::app_role) OR
    public.has_role(auth.uid(), 'org_admin'::app_role)
  );

-- board_role_overrides: Board members can view, admins can manage
ALTER TABLE public.board_role_overrides DROP POLICY IF EXISTS "Board members can view role overrides";
CREATE POLICY "Board members can view role overrides" ON public.board_role_overrides
  FOR SELECT USING (
    board_id IN (
      SELECT board_id FROM public.board_memberships WHERE user_id = auth.uid()
    )
  );

ALTER TABLE public.board_role_overrides DROP POLICY IF EXISTS "Admins can manage role overrides";
CREATE POLICY "Admins can manage role overrides" ON public.board_role_overrides
  FOR ALL USING (
    public.has_role(auth.uid(), 'org_admin'::app_role) OR
    public.has_role(auth.uid(), 'chair'::app_role)
  );

-- document_submissions: Users can create, approvers can review
ALTER TABLE public.document_submissions DROP POLICY IF EXISTS "Users can create submissions";
CREATE POLICY "Users can create submissions" ON public.document_submissions
  FOR INSERT WITH CHECK (submitted_by = auth.uid());

ALTER TABLE public.document_submissions DROP POLICY IF EXISTS "Users can view submissions in their org";
CREATE POLICY "Users can view submissions in their org" ON public.document_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.archived_documents ad
      JOIN public.profiles p ON p.org_id = ad.org_id
      WHERE ad.id = document_submissions.document_id AND p.id = auth.uid()
    )
  );

ALTER TABLE public.document_submissions DROP POLICY IF EXISTS "Approvers can review submissions";
CREATE POLICY "Approvers can review submissions" ON public.document_submissions
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'chair'::app_role) OR
    public.has_role(auth.uid(), 'org_admin'::app_role) OR
    public.has_role(auth.uid(), 'executive'::app_role)
  );

-- 9. Audit trigger for submission reviews
CREATE OR REPLACE FUNCTION public.log_submission_review()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.audit_log (
      entity_type, 
      entity_id, 
      actor_id, 
      action, 
      detail_json,
      timestamp
    ) VALUES (
      'document_submission',
      NEW.id,
      auth.uid(),
      'submission_reviewed',
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'comments', NEW.comments,
        'reviewed_by', NEW.reviewed_by
      ),
      now()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trig_log_submission_review ON public.document_submissions;
CREATE TRIGGER trig_log_submission_review
  AFTER UPDATE ON public.document_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_submission_review();

-- Trigger for updated_at on board_settings
DROP TRIGGER IF EXISTS update_board_settings_updated_at ON public.board_settings;
CREATE TRIGGER update_board_settings_updated_at
  BEFORE UPDATE ON public.board_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------
-- Migration file: 20251018151912_212d410e-3d82-4c5d-912a-8127493c47c9.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251018151912_212d410e-3d82-4c5d-912a-8127493c47c9.sql
-- ----------------------------------------------------------------
-- Fix RLS on roles metadata table
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read role metadata (for UI dropdowns, etc)
ALTER TABLE public.roles DROP POLICY IF EXISTS "Anyone can view role metadata";
CREATE POLICY "Anyone can view role metadata" ON public.roles
  FOR SELECT USING (true);

-- Only super admins can modify role definitions
ALTER TABLE public.roles DROP POLICY IF EXISTS "Super admins can manage roles";
CREATE POLICY "Super admins can manage roles" ON public.roles
  FOR ALL USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- ----------------------------------------------------------------
-- Migration file: 20251020055702_1a8e1528-a823-4bb7-a2a2-7eb9d10cb7b5.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251020055702_1a8e1528-a823-4bb7-a2a2-7eb9d10cb7b5.sql
-- ----------------------------------------------------------------
-- Move extensions from public schema to extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move vector extension to extensions schema
DROP EXTENSION IF EXISTS vector CASCADE;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Grant usage on extensions schema to necessary roles
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- ----------------------------------------------------------------
-- Migration file: 20251020063739_26674952-5b2a-4b5e-9a0b-84045b5d227e.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251020063739_26674952-5b2a-4b5e-9a0b-84045b5d227e.sql
-- ----------------------------------------------------------------
-- Create enum for template scope
CREATE TYPE template_scope AS ENUM ('personal', 'team', 'organization');

-- Create enum for draft status
CREATE TYPE draft_status AS ENUM ('in_progress', 'awaiting_review', 'approved', 'archived');

-- Templates table
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scope template_scope NOT NULL DEFAULT 'personal',
  tags TEXT[] NOT NULL DEFAULT '{}',
  default_for_sections TEXT[] NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  published BOOLEAN DEFAULT true,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  sections JSONB NOT NULL DEFAULT '[]',
  permissions JSONB DEFAULT '{"can_edit": [], "can_delete": []}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Document drafts table
CREATE TABLE document_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  section_key TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  status draft_status DEFAULT 'in_progress',
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_saved TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Template approvals table
CREATE TABLE template_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES templates(id) ON DELETE CASCADE NOT NULL,
  requested_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  requested_scope template_scope NOT NULL,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User template preferences
CREATE TABLE user_template_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  section_key TEXT NOT NULL,
  preferred_template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, section_key)
);

-- Enable RLS
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_template_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for templates
CREATE POLICY "Users can view templates in their scope"
ON templates FOR SELECT
USING (
  scope = 'personal' AND author_id = auth.uid()
  OR scope = 'team' AND board_id IN (SELECT board_id FROM board_memberships WHERE user_id = auth.uid())
  OR scope = 'organization' AND org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  OR published = true
);

CREATE POLICY "Users can create personal templates"
ON templates FOR INSERT
WITH CHECK (author_id = auth.uid() AND scope = 'personal');

CREATE POLICY "Users can update their own templates"
ON templates FOR UPDATE
USING (author_id = auth.uid() OR has_role(auth.uid(), 'org_admin'));

CREATE POLICY "Users can delete their own templates"
ON templates FOR DELETE
USING (author_id = auth.uid() OR has_role(auth.uid(), 'org_admin'));

-- RLS Policies for document_drafts
CREATE POLICY "Users can view their own drafts"
ON document_drafts FOR SELECT
USING (
  created_by = auth.uid()
  OR board_id IN (SELECT board_id FROM board_memberships WHERE user_id = auth.uid())
);

CREATE POLICY "Users can create drafts"
ON document_drafts FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own drafts"
ON document_drafts FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own drafts"
ON document_drafts FOR DELETE
USING (created_by = auth.uid());

-- RLS Policies for template_approvals
CREATE POLICY "Users can view approval requests"
ON template_approvals FOR SELECT
USING (
  requested_by = auth.uid()
  OR has_role(auth.uid(), 'org_admin')
  OR has_role(auth.uid(), 'chair')
);

CREATE POLICY "Users can create approval requests"
ON template_approvals FOR INSERT
WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Admins can update approvals"
ON template_approvals FOR UPDATE
USING (has_role(auth.uid(), 'org_admin') OR has_role(auth.uid(), 'chair'));

-- RLS Policies for user_template_preferences
CREATE POLICY "Users can manage their own preferences"
ON user_template_preferences FOR ALL
USING (user_id = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_drafts_updated_at
  BEFORE UPDATE ON document_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_template_preferences_updated_at
  BEFORE UPDATE ON user_template_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_templates_author ON templates(author_id);
CREATE INDEX idx_templates_scope ON templates(scope);
CREATE INDEX idx_templates_tags ON templates USING GIN(tags);
CREATE INDEX idx_document_drafts_created_by ON document_drafts(created_by);
CREATE INDEX idx_document_drafts_section ON document_drafts(section_key);
CREATE INDEX idx_document_drafts_status ON document_drafts(status);

-- ----------------------------------------------------------------
-- Migration file: 20251020082929_54cbaa26-170b-4196-a011-76129541a14b.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251020082929_54cbaa26-170b-4196-a011-76129541a14b.sql
-- ----------------------------------------------------------------
-- Fix 1: Create security definer function to get user's org_id without recursion
CREATE OR REPLACE FUNCTION public.get_user_org_id(user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.profiles WHERE id = user_id LIMIT 1;
$$;

-- Fix 2: Create security definer function to check board membership without recursion
CREATE OR REPLACE FUNCTION public.is_board_member(user_id uuid, board_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.board_memberships 
    WHERE user_id = is_board_member.user_id 
    AND board_id = is_board_member.board_id
  );
$$;

-- Fix 3: Drop ALL policies that depend on profiles.role column
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view documents in their org" ON public.archived_documents;
DROP POLICY IF EXISTS "Admins can view audit log" ON public.audit_log;
DROP POLICY IF EXISTS "Users can view board memberships" ON public.board_memberships;
DROP POLICY IF EXISTS "Board members can view memberships" ON public.board_memberships;

-- Fix 4: Migrate role data from profiles to user_roles (using correct enum values)
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::app_role 
FROM public.profiles 
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Fix 5: Now drop the role column
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role CASCADE;

-- Fix 6: Create new RLS policies for profiles using security definer functions
ALTER TABLE public.profiles DROP POLICY IF EXISTS "Users can view own profile";
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

ALTER TABLE public.profiles DROP POLICY IF EXISTS "Users can view profiles in same org";
CREATE POLICY "Users can view profiles in same org"
ON public.profiles
FOR SELECT
TO authenticated
USING (org_id = get_user_org_id(auth.uid()));

ALTER TABLE public.profiles DROP POLICY IF EXISTS "Users can update own profile";
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Fix 7: Create new RLS policies for board_memberships
ALTER TABLE public.board_memberships DROP POLICY IF EXISTS "Users can view own memberships";
CREATE POLICY "Users can view own memberships"
ON public.board_memberships
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

ALTER TABLE public.board_memberships DROP POLICY IF EXISTS "Admins can view all memberships";
CREATE POLICY "Admins can view all memberships"
ON public.board_memberships
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin') 
  OR has_role(auth.uid(), 'org_admin')
);

-- Fix 8: Secure archived_documents using has_role
ALTER TABLE public.archived_documents DROP POLICY IF EXISTS "Board members can view documents";
CREATE POLICY "Board members can view documents"
ON public.archived_documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.board_memberships
    WHERE board_memberships.user_id = auth.uid()
    AND board_memberships.board_id = archived_documents.board_id
  )
  OR has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'org_admin')
);

-- Fix 9: Secure audit_log using has_role
ALTER TABLE public.audit_log DROP POLICY IF EXISTS "Admins can view audit log";
CREATE POLICY "Admins can view audit log"
ON public.audit_log
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin') 
  OR has_role(auth.uid(), 'org_admin')
);

-- Fix 10: Secure extracted_decisions
DROP POLICY IF EXISTS "Users can view decisions" ON public.extracted_decisions;

ALTER TABLE public.extracted_decisions DROP POLICY IF EXISTS "Board members can view decisions";
CREATE POLICY "Board members can view decisions"
ON public.extracted_decisions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.archived_documents ad
    JOIN public.board_memberships bm ON bm.board_id = ad.board_id
    WHERE ad.id = extracted_decisions.document_id
    AND bm.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'org_admin')
);

-- ----------------------------------------------------------------
-- Migration file: 20251020100431_6386fa02-7842-4736-93a3-dea2cbbfa338.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251020100431_6386fa02-7842-4736-93a3-dea2cbbfa338.sql
-- ----------------------------------------------------------------
-- Add comprehensive company details to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS business_number text,
ADD COLUMN IF NOT EXISTS primary_contact_name text,
ADD COLUMN IF NOT EXISTS primary_contact_role text,
ADD COLUMN IF NOT EXISTS primary_contact_email text,
ADD COLUMN IF NOT EXISTS primary_contact_phone text,
ADD COLUMN IF NOT EXISTS admin_name text,
ADD COLUMN IF NOT EXISTS admin_role text,
ADD COLUMN IF NOT EXISTS admin_email text,
ADD COLUMN IF NOT EXISTS admin_phone text,
ADD COLUMN IF NOT EXISTS reporting_frequency text CHECK (reporting_frequency IN ('monthly', 'bi-monthly', 'quarterly', 'biannually')),
ADD COLUMN IF NOT EXISTS financial_year_end date,
ADD COLUMN IF NOT EXISTS agm_date date;

-- Add phone number to profiles table for completeness
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone text;

-- ----------------------------------------------------------------
-- Migration file: 20251020102249_b2a43003-0468-4336-86bd-a01198e129a1.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251020102249_b2a43003-0468-4336-86bd-a01198e129a1.sql
-- ----------------------------------------------------------------
-- Add company phone and GST period to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS company_phone text,
ADD COLUMN IF NOT EXISTS gst_period text;

-- ----------------------------------------------------------------
-- Migration file: 20251020103403_1d0626bf-d3ca-43f4-b195-482c589ba1e7.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251020103403_1d0626bf-d3ca-43f4-b195-482c589ba1e7.sql
-- ----------------------------------------------------------------
-- Add UPDATE policy for organizations table
ALTER TABLE public.organizations DROP POLICY IF EXISTS "Users can update their organization";
CREATE POLICY "Users can update their organization"
ON public.organizations
FOR UPDATE
USING (
  id IN (
    SELECT org_id
    FROM public.profiles
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  id IN (
    SELECT org_id
    FROM public.profiles
    WHERE id = auth.uid()
  )
);

-- ----------------------------------------------------------------
-- Migration file: 20251020103543_c6af7d02-1a3f-4ad0-9f13-d37c0f4d59fd.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251020103543_c6af7d02-1a3f-4ad0-9f13-d37c0f4d59fd.sql
-- ----------------------------------------------------------------
-- Fix infinite recursion in profiles RLS policies
-- Drop problematic policies
DROP POLICY IF EXISTS "Users can view profiles in same org" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their org" ON public.profiles;

-- Recreate the policy without recursion
-- Users can view profiles in their organization by directly comparing org_id
ALTER TABLE public.profiles DROP POLICY IF EXISTS "Users can view profiles in same org";
CREATE POLICY "Users can view profiles in same org" 
ON public.profiles 
FOR SELECT 
USING (
  org_id IN (
    SELECT p.org_id 
    FROM public.profiles p 
    WHERE p.id = auth.uid()
  )
  OR id = auth.uid()
);

-- ----------------------------------------------------------------
-- Migration file: 20251020103700_27117cf7-9475-43d7-a465-638a4a05525d.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251020103700_27117cf7-9475-43d7-a465-638a4a05525d.sql
-- ----------------------------------------------------------------
-- Fix infinite recursion by using security definer function
-- Drop all conflicting policies on profiles
DROP POLICY IF EXISTS "Users can view profiles in same org" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their org" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- We already have get_user_org_id function, so let's use it
-- Create clean, non-recursive policies

-- Users can view their own profile
ALTER TABLE public.profiles DROP POLICY IF EXISTS "Users can view own profile";
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (id = auth.uid());

-- Users can view profiles in their organization (using security definer function)
ALTER TABLE public.profiles DROP POLICY IF EXISTS "Users can view org profiles";
CREATE POLICY "Users can view org profiles"
ON public.profiles
FOR SELECT
USING (
  org_id IS NOT NULL 
  AND org_id = public.get_user_org_id(auth.uid())
);

-- Users can update their own profile
ALTER TABLE public.profiles DROP POLICY IF EXISTS "Users can update own profile";
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ----------------------------------------------------------------
-- Migration file: 20251020103853_e1213829-7862-4dcf-bff1-31f5e3bd2700.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251020103853_e1213829-7862-4dcf-bff1-31f5e3bd2700.sql
-- ----------------------------------------------------------------
-- Allow users to create organizations
ALTER TABLE public.organizations DROP POLICY IF EXISTS "Users can create organizations";
CREATE POLICY "Users can create organizations"
ON public.organizations
FOR INSERT
WITH CHECK (true);

-- ----------------------------------------------------------------
-- Migration file: 20251020103959_514cbb45-53c7-4eb5-a346-8583a18510a4.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251020103959_514cbb45-53c7-4eb5-a346-8583a18510a4.sql
-- ----------------------------------------------------------------
-- Drop and recreate INSERT policy for organizations
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;

-- Allow authenticated users to create organizations
ALTER TABLE public.organizations DROP POLICY IF EXISTS "Users can insert organizations";
CREATE POLICY "Users can insert organizations"
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ----------------------------------------------------------------
-- Migration file: 20251020111120_2888261d-f973-496c-bb9d-fcccf7fa88af.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251020111120_2888261d-f973-496c-bb9d-fcccf7fa88af.sql
-- ----------------------------------------------------------------
-- Create board_members table with Public/Internal/Confidential fields
CREATE TABLE public.board_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Public fields (can be published with consent)
  full_name TEXT NOT NULL,
  preferred_title TEXT,
  public_job_title TEXT,
  short_bio TEXT,
  public_photo_url TEXT,
  public_company_affiliations TEXT,
  professional_qualifications TEXT,
  public_social_links JSONB DEFAULT '{}'::jsonb,
  public_contact_email TEXT,
  
  -- Internal fields (visible to board members)
  legal_name TEXT,
  personal_mobile TEXT,
  personal_email TEXT,
  cv_file_url TEXT,
  detailed_work_history TEXT,
  appointment_date DATE,
  term_expiry DATE,
  reappointment_history JSONB DEFAULT '[]'::jsonb,
  skills_competencies JSONB DEFAULT '[]'::jsonb,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  
  -- Confidential fields (admin only)
  national_id TEXT,
  home_address TEXT,
  sensitive_notes TEXT,
  
  -- Consent & publishing
  publish_preferences JSONB DEFAULT '{}'::jsonb,
  consent_signed_at TIMESTAMPTZ,
  consent_signature TEXT,
  
  -- Status & metadata
  status TEXT DEFAULT 'invited' CHECK (status IN ('invited', 'pending', 'active', 'inactive')),
  invite_token TEXT UNIQUE,
  invite_sent_at TIMESTAMPTZ,
  profile_completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create COI table
CREATE TABLE public.board_member_coi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.board_members(id) ON DELETE CASCADE,
  
  declared_interest TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('financial', 'familial', 'contractual', 'other')),
  related_party_name TEXT,
  date_declared DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'mitigated', 'resolved')),
  management_steps TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create audit trail for member changes
CREATE TABLE public.board_member_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.board_members(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES auth.users(id),
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  change_type TEXT NOT NULL CHECK (change_type IN ('created', 'updated', 'published', 'unpublished')),
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_member_coi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_member_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies for board_members
ALTER TABLE public.board_members DROP POLICY IF EXISTS "Board members can view members in their boards";
CREATE POLICY "Board members can view members in their boards"
  ON public.board_members FOR SELECT
  USING (
    board_id IN (
      SELECT board_id FROM public.board_memberships 
      WHERE user_id = auth.uid()
    )
  );

ALTER TABLE public.board_members DROP POLICY IF EXISTS "Admins can manage board members";
CREATE POLICY "Admins can manage board members"
  ON public.board_members FOR ALL
  USING (
    has_role(auth.uid(), 'org_admin'::app_role) OR 
    has_role(auth.uid(), 'chair'::app_role)
  );

ALTER TABLE public.board_members DROP POLICY IF EXISTS "Members can complete their own profile";
CREATE POLICY "Members can complete their own profile"
  ON public.board_members FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for COI
ALTER TABLE public.board_member_coi DROP POLICY IF EXISTS "Board members can view COI in their boards";
CREATE POLICY "Board members can view COI in their boards"
  ON public.board_member_coi FOR SELECT
  USING (
    member_id IN (
      SELECT id FROM public.board_members 
      WHERE board_id IN (
        SELECT board_id FROM public.board_memberships 
        WHERE user_id = auth.uid()
      )
    )
  );

ALTER TABLE public.board_member_coi DROP POLICY IF EXISTS "Members can manage their own COI";
CREATE POLICY "Members can manage their own COI"
  ON public.board_member_coi FOR ALL
  USING (
    member_id IN (
      SELECT id FROM public.board_members WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for audit
ALTER TABLE public.board_member_audit DROP POLICY IF EXISTS "Admins can view audit logs";
CREATE POLICY "Admins can view audit logs"
  ON public.board_member_audit FOR SELECT
  USING (
    has_role(auth.uid(), 'org_admin'::app_role) OR 
    has_role(auth.uid(), 'chair'::app_role)
  );

ALTER TABLE public.board_member_audit DROP POLICY IF EXISTS "System can create audit logs";
CREATE POLICY "System can create audit logs"
  ON public.board_member_audit FOR INSERT
  WITH CHECK (true);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_board_members_updated_at ON public.board_members;
CREATE TRIGGER update_board_members_updated_at
  BEFORE UPDATE ON public.board_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_board_member_coi_updated_at ON public.board_member_coi;
CREATE TRIGGER update_board_member_coi_updated_at
  BEFORE UPDATE ON public.board_member_coi
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate invite token
CREATE OR REPLACE FUNCTION public.generate_member_invite_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$;

-- ----------------------------------------------------------------
-- Migration file: 20251020112328_950c4ede-357b-44a6-92e5-25358aba4806.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251020112328_950c4ede-357b-44a6-92e5-25358aba4806.sql
-- ----------------------------------------------------------------
-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule annual review reminders to run monthly
-- This will check for members whose profiles are over 1 year old
SELECT cron.schedule(
  'send-annual-review-reminders',
  '0 9 1 * *', -- Run at 9 AM on the 1st of each month
  $$
  SELECT
    net.http_post(
        url:='https://lomksomekpysjgtnlguq.supabase.co/functions/v1/send-annual-review',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvbWtzb21la3B5c2pndG5sZ3VxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NjEyMDgsImV4cCI6MjA3NjMzNzIwOH0.xwRiW2B8X51puDJ3IxnwKWsUsv7jRHsAIJjd6Wkq-JA"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);

-- ----------------------------------------------------------------
-- Migration file: 20251020112350_98031be2-5803-4ced-8da1-c5b4ff8027e1.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251020112350_98031be2-5803-4ced-8da1-c5b4ff8027e1.sql
-- ----------------------------------------------------------------
-- Fix search_path for generate_member_invite_token function
DROP FUNCTION IF EXISTS public.generate_member_invite_token();

CREATE OR REPLACE FUNCTION public.generate_member_invite_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$;

-- ----------------------------------------------------------------
-- Migration file: 20251020113347_a2f2f50f-09cc-486f-b243-2018639e05df.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251020113347_a2f2f50f-09cc-486f-b243-2018639e05df.sql
-- ----------------------------------------------------------------
-- Add member_type and position fields to board_members table
ALTER TABLE public.board_members 
ADD COLUMN member_type TEXT DEFAULT 'board' CHECK (member_type IN ('board', 'executive', 'key_staff')),
ADD COLUMN position TEXT;

-- Add comments for clarity
COMMENT ON COLUMN public.board_members.member_type IS 'Type of member: board, executive, or key_staff';
COMMENT ON COLUMN public.board_members.position IS 'Specific position: chair, deputy_chair, ceo, cfo, etc.';

-- Create index for efficient filtering
CREATE INDEX idx_board_members_type_board ON public.board_members(board_id, member_type, status);

-- ----------------------------------------------------------------
-- Migration file: 20251020134129_4a3d9927-f0c8-492d-9a76-d9caaa292ccc.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251020134129_4a3d9927-f0c8-492d-9a76-d9caaa292ccc.sql
-- ----------------------------------------------------------------
-- Create enum for compliance frequency
CREATE TYPE public.compliance_frequency AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'semi_annual', 'annual', 'biennial', 'as_required');

-- Create enum for compliance status
CREATE TYPE public.compliance_status AS ENUM ('compliant', 'due_soon', 'overdue', 'not_applicable', 'in_progress');

-- Create compliance_categories table
CREATE TABLE public.compliance_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create compliance_items table
CREATE TABLE public.compliance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.compliance_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  authority TEXT,
  frequency public.compliance_frequency NOT NULL DEFAULT 'annual',
  next_due_date DATE,
  last_completed_date DATE,
  responsible_person TEXT,
  status public.compliance_status NOT NULL DEFAULT 'compliant',
  industry_sector TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  reminder_days_before INTEGER DEFAULT 30,
  notes TEXT,
  reference_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create compliance_reviews table
CREATE TABLE public.compliance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compliance_item_id UUID NOT NULL REFERENCES public.compliance_items(id) ON DELETE CASCADE,
  reviewed_by UUID NOT NULL REFERENCES public.profiles(id),
  review_date DATE NOT NULL,
  status public.compliance_status NOT NULL,
  notes TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  signed_off_by UUID REFERENCES public.profiles(id),
  signed_off_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create compliance_templates table (for industry-specific defaults)
CREATE TABLE public.compliance_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_sector TEXT NOT NULL,
  category_id UUID REFERENCES public.compliance_categories(id),
  title TEXT NOT NULL,
  description TEXT,
  authority TEXT,
  frequency public.compliance_frequency NOT NULL,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  reference_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.compliance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for compliance_categories
ALTER TABLE public.compliance_categories DROP POLICY IF EXISTS "Anyone can view compliance categories";
CREATE POLICY "Anyone can view compliance categories"
  ON public.compliance_categories FOR SELECT
  USING (true);

-- RLS Policies for compliance_items
ALTER TABLE public.compliance_items DROP POLICY IF EXISTS "Users can view compliance items in their org";
CREATE POLICY "Users can view compliance items in their org"
  ON public.compliance_items FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.compliance_items DROP POLICY IF EXISTS "Users can create compliance items in their org";
CREATE POLICY "Users can create compliance items in their org"
  ON public.compliance_items FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.compliance_items DROP POLICY IF EXISTS "Users can update compliance items in their org";
CREATE POLICY "Users can update compliance items in their org"
  ON public.compliance_items FOR UPDATE
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.compliance_items DROP POLICY IF EXISTS "Admins can delete compliance items";
CREATE POLICY "Admins can delete compliance items"
  ON public.compliance_items FOR DELETE
  USING (has_role(auth.uid(), 'org_admin'::app_role) OR has_role(auth.uid(), 'chair'::app_role));

-- RLS Policies for compliance_reviews
ALTER TABLE public.compliance_reviews DROP POLICY IF EXISTS "Users can view compliance reviews in their org";
CREATE POLICY "Users can view compliance reviews in their org"
  ON public.compliance_reviews FOR SELECT
  USING (compliance_item_id IN (
    SELECT id FROM public.compliance_items 
    WHERE org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  ));

ALTER TABLE public.compliance_reviews DROP POLICY IF EXISTS "Users can create compliance reviews";
CREATE POLICY "Users can create compliance reviews"
  ON public.compliance_reviews FOR INSERT
  WITH CHECK (reviewed_by = auth.uid());

ALTER TABLE public.compliance_reviews DROP POLICY IF EXISTS "Users can update their own reviews";
CREATE POLICY "Users can update their own reviews"
  ON public.compliance_reviews FOR UPDATE
  USING (reviewed_by = auth.uid());

-- RLS Policies for compliance_templates
ALTER TABLE public.compliance_templates DROP POLICY IF EXISTS "Anyone can view compliance templates";
CREATE POLICY "Anyone can view compliance templates"
  ON public.compliance_templates FOR SELECT
  USING (true);

-- DROP TRIGGER IF EXISTS for ON public.compliance_items;
Create trigger for updated_at
CREATE TRIGGER update_compliance_items_updated_at
  BEFORE UPDATE ON public.compliance_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.compliance_categories (name, description, icon) VALUES
  ('Tax & Financial', 'Tax obligations, financial reporting, and audit requirements', 'DollarSign'),
  ('Health & Safety', 'Workplace health and safety regulations', 'Shield'),
  ('Environmental', 'Environmental regulations and sustainability requirements', 'Leaf'),
  ('Employment', 'Employment law and workplace relations', 'Users'),
  ('Data & Privacy', 'Data protection and privacy regulations', 'Lock'),
  ('Industry Specific', 'Industry-specific regulations and certifications', 'Building'),
  ('Corporate Governance', 'Corporate governance and reporting requirements', 'FileText'),
  ('Insurance', 'Insurance policies and coverage requirements', 'Umbrella');

-- Insert some NZ-specific compliance templates
INSERT INTO public.compliance_templates (industry_sector, title, description, authority, frequency, is_mandatory, category_id) VALUES
  ('all', 'GST Returns', 'Goods and Services Tax returns to be filed with IRD', 'Inland Revenue', 'monthly', true, (SELECT id FROM public.compliance_categories WHERE name = 'Tax & Financial')),
  ('all', 'PAYE Returns', 'Pay As You Earn tax deductions for employees', 'Inland Revenue', 'monthly', true, (SELECT id FROM public.compliance_categories WHERE name = 'Tax & Financial')),
  ('all', 'Provisional Tax', 'Provisional tax payments for income tax', 'Inland Revenue', 'quarterly', true, (SELECT id FROM public.compliance_categories WHERE name = 'Tax & Financial')),
  ('all', 'Annual Financial Statements', 'Preparation and filing of annual financial statements', 'Companies Office', 'annual', true, (SELECT id FROM public.compliance_categories WHERE name = 'Tax & Financial')),
  ('all', 'Annual Return', 'Annual return to Companies Office', 'Companies Office', 'annual', true, (SELECT id FROM public.compliance_categories WHERE name = 'Corporate Governance')),
  ('food_service', 'Food Safety Inspection', 'Health and safety inspection for food premises', 'Local Council', 'annual', true, (SELECT id FROM public.compliance_categories WHERE name = 'Health & Safety')),
  ('food_service', 'Food Control Plan', 'Maintain and review food control plan', 'MPI', 'annual', true, (SELECT id FROM public.compliance_categories WHERE name = 'Health & Safety')),
  ('all', 'Health & Safety Policy Review', 'Review and update health and safety policies', 'WorkSafe NZ', 'annual', true, (SELECT id FROM public.compliance_categories WHERE name = 'Health & Safety')),
  ('all', 'Privacy Policy Review', 'Review privacy policy compliance', 'Privacy Commissioner', 'annual', true, (SELECT id FROM public.compliance_categories WHERE name = 'Data & Privacy'));

-- Create function to calculate next due date
CREATE OR REPLACE FUNCTION public.calculate_next_due_date(
  last_date DATE,
  freq public.compliance_frequency
)
RETURNS DATE
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN CASE freq
    WHEN 'daily' THEN last_date + INTERVAL '1 day'
    WHEN 'weekly' THEN last_date + INTERVAL '1 week'
    WHEN 'monthly' THEN last_date + INTERVAL '1 month'
    WHEN 'quarterly' THEN last_date + INTERVAL '3 months'
    WHEN 'semi_annual' THEN last_date + INTERVAL '6 months'
    WHEN 'annual' THEN last_date + INTERVAL '1 year'
    WHEN 'biennial' THEN last_date + INTERVAL '2 years'
    ELSE NULL
  END;
END;
$$;

-- ----------------------------------------------------------------
-- Migration file: 20251020134832_85772c2c-fed4-47a7-ab9c-8ca688469089.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251020134832_85772c2c-fed4-47a7-ab9c-8ca688469089.sql
-- ----------------------------------------------------------------
-- Add industry and business category to organizations
ALTER TABLE public.organizations
ADD COLUMN industry_sector TEXT,
ADD COLUMN business_category TEXT,
ADD COLUMN compliance_scan_completed BOOLEAN DEFAULT false,
ADD COLUMN compliance_scan_date TIMESTAMP WITH TIME ZONE;

-- Create function to trigger compliance scan
CREATE OR REPLACE FUNCTION public.trigger_compliance_scan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark that a scan is needed when industry or category changes
  IF (NEW.industry_sector IS DISTINCT FROM OLD.industry_sector) OR 
     (NEW.business_category IS DISTINCT FROM OLD.business_category) THEN
    NEW.compliance_scan_completed = false;
    NEW.compliance_scan_date = NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- DROP TRIGGER IF EXISTS CREATE ON public.organizations;
Create trigger
CREATE TRIGGER organization_compliance_scan_trigger
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.trigger_compliance_scan();

-- ----------------------------------------------------------------
-- Migration file: 20251020143049_c4b90435-c22f-4deb-879e-eda15aa950d6.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251020143049_c4b90435-c22f-4deb-879e-eda15aa950d6.sql
-- ----------------------------------------------------------------
-- Update organizations table to support multiple industries and categories
ALTER TABLE public.organizations 
  ALTER COLUMN industry_sector TYPE text[] USING CASE 
    WHEN industry_sector IS NULL THEN NULL 
    ELSE ARRAY[industry_sector]::text[]
  END;

ALTER TABLE public.organizations 
  ALTER COLUMN business_category TYPE text[] USING CASE 
    WHEN business_category IS NULL THEN NULL 
    ELSE ARRAY[business_category]::text[]
  END;

COMMENT ON COLUMN public.organizations.industry_sector IS 'Multiple industry sectors the business operates in';
COMMENT ON COLUMN public.organizations.business_category IS 'Multiple business categories for government classification';

-- ----------------------------------------------------------------
-- Migration file: 20251021003538_e2ce76f7-4d93-41a0-adad-a7278bc4fbdd.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251021003538_e2ce76f7-4d93-41a0-adad-a7278bc4fbdd.sql
-- ----------------------------------------------------------------
-- Add missing fields to board_members table for comprehensive team member profiles

ALTER TABLE board_members 
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS reports_to uuid REFERENCES board_members(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reports_responsible_for jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS personal_interests text,
ADD COLUMN IF NOT EXISTS health_notes text;

-- Add index for reports_to for better query performance
CREATE INDEX IF NOT EXISTS idx_board_members_reports_to ON board_members(reports_to);

-- Add comment to clarify health_notes is sensitive
COMMENT ON COLUMN board_members.health_notes IS 'Sensitive: Health information voluntarily shared by team member';

-- ----------------------------------------------------------------
-- Migration file: 20251021015450_9335d49f-6157-4829-a0e4-ab351b810bd7.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251021015450_9335d49f-6157-4829-a0e4-ab351b810bd7.sql
-- ----------------------------------------------------------------
-- Create table for staff form templates
CREATE TABLE public.staff_form_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  form_type TEXT NOT NULL CHECK (form_type IN ('board_members', 'executive_team', 'key_staff')),
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(org_id, form_type)
);

-- Enable RLS
ALTER TABLE public.staff_form_templates ENABLE ROW LEVEL SECURITY;

-- Policies
ALTER TABLE public.staff_form_templates DROP POLICY IF EXISTS "Users can view their org templates";
CREATE POLICY "Users can view their org templates"
ON public.staff_form_templates
FOR SELECT
USING (org_id IN (
  SELECT org_id FROM profiles WHERE id = auth.uid()
));

ALTER TABLE public.staff_form_templates DROP POLICY IF EXISTS "Admins can manage templates";
CREATE POLICY "Admins can manage templates"
ON public.staff_form_templates
FOR ALL
USING (
  has_role(auth.uid(), 'org_admin'::app_role) OR 
  has_role(auth.uid(), 'chair'::app_role)
);

-- DROP TRIGGER IF EXISTS for ON public.staff_form_templates;
Create trigger for updated_at
CREATE TRIGGER update_staff_form_templates_updated_at
BEFORE UPDATE ON public.staff_form_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default templates for all three types
CREATE OR REPLACE FUNCTION create_default_staff_form_templates(p_org_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Board Members template
  INSERT INTO public.staff_form_templates (org_id, form_type, fields)
  VALUES (p_org_id, 'board_members', '[
    {"id": "full_name", "label": "Full Name", "required": true, "enabled": true, "field_type": "text", "order": 0, "locked": true},
    {"id": "preferred_title", "label": "Preferred Title", "required": true, "enabled": true, "field_type": "text", "order": 1, "locked": true},
    {"id": "personal_email", "label": "Email Address", "required": true, "enabled": true, "field_type": "email", "order": 2, "locked": true},
    {"id": "personal_mobile", "label": "Phone Number", "required": true, "enabled": true, "field_type": "phone", "order": 3, "locked": true},
    {"id": "position", "label": "Position Held", "required": true, "enabled": true, "field_type": "text", "order": 4, "locked": true},
    {"id": "home_address", "label": "Home Address", "required": false, "enabled": true, "field_type": "textarea", "order": 5, "locked": false},
    {"id": "date_of_birth", "label": "Date of Birth", "required": false, "enabled": true, "field_type": "date", "order": 6, "locked": false},
    {"id": "public_social_links", "label": "LinkedIn Profile", "required": false, "enabled": true, "field_type": "url", "order": 7, "locked": false},
    {"id": "reports_responsible_for", "label": "Reports Responsible For", "required": false, "enabled": true, "field_type": "textarea", "order": 8, "locked": false},
    {"id": "reports_to", "label": "Reports To", "required": false, "enabled": true, "field_type": "select", "order": 9, "locked": false},
    {"id": "professional_qualifications", "label": "Qualifications", "required": false, "enabled": true, "field_type": "textarea", "order": 10, "locked": false},
    {"id": "conflicts_of_interest", "label": "Conflicts of Interest", "required": false, "enabled": true, "field_type": "textarea", "order": 11, "locked": false},
    {"id": "personal_interests", "label": "Personal Interests/Hobbies", "required": false, "enabled": true, "field_type": "textarea", "order": 12, "locked": false},
    {"id": "health_notes", "label": "Health Issues", "required": false, "enabled": true, "field_type": "textarea", "order": 13, "locked": false},
    {"id": "emergency_contact_name", "label": "Emergency Contact Name", "required": false, "enabled": true, "field_type": "text", "order": 14, "locked": false},
    {"id": "emergency_contact_phone", "label": "Emergency Contact Phone", "required": false, "enabled": true, "field_type": "phone", "order": 15, "locked": false}
  ]'::jsonb)
  ON CONFLICT (org_id, form_type) DO NOTHING;

  -- Executive Team template
  INSERT INTO public.staff_form_templates (org_id, form_type, fields)
  VALUES (p_org_id, 'executive_team', '[
    {"id": "full_name", "label": "Full Name", "required": true, "enabled": true, "field_type": "text", "order": 0, "locked": true},
    {"id": "preferred_title", "label": "Preferred Title", "required": true, "enabled": true, "field_type": "text", "order": 1, "locked": true},
    {"id": "personal_email", "label": "Email Address", "required": true, "enabled": true, "field_type": "email", "order": 2, "locked": true},
    {"id": "personal_mobile", "label": "Phone Number", "required": true, "enabled": true, "field_type": "phone", "order": 3, "locked": true},
    {"id": "position", "label": "Position Held", "required": true, "enabled": true, "field_type": "text", "order": 4, "locked": true},
    {"id": "home_address", "label": "Home Address", "required": false, "enabled": true, "field_type": "textarea", "order": 5, "locked": false},
    {"id": "date_of_birth", "label": "Date of Birth", "required": false, "enabled": true, "field_type": "date", "order": 6, "locked": false},
    {"id": "public_social_links", "label": "LinkedIn Profile", "required": false, "enabled": true, "field_type": "url", "order": 7, "locked": false},
    {"id": "reports_responsible_for", "label": "Reports Responsible For", "required": false, "enabled": true, "field_type": "textarea", "order": 8, "locked": false},
    {"id": "reports_to", "label": "Reports To", "required": false, "enabled": true, "field_type": "select", "order": 9, "locked": false},
    {"id": "professional_qualifications", "label": "Qualifications", "required": false, "enabled": true, "field_type": "textarea", "order": 10, "locked": false},
    {"id": "conflicts_of_interest", "label": "Conflicts of Interest", "required": false, "enabled": true, "field_type": "textarea", "order": 11, "locked": false},
    {"id": "personal_interests", "label": "Personal Interests/Hobbies", "required": false, "enabled": true, "field_type": "textarea", "order": 12, "locked": false},
    {"id": "health_notes", "label": "Health Issues", "required": false, "enabled": true, "field_type": "textarea", "order": 13, "locked": false},
    {"id": "emergency_contact_name", "label": "Emergency Contact Name", "required": false, "enabled": true, "field_type": "text", "order": 14, "locked": false},
    {"id": "emergency_contact_phone", "label": "Emergency Contact Phone", "required": false, "enabled": true, "field_type": "phone", "order": 15, "locked": false}
  ]'::jsonb)
  ON CONFLICT (org_id, form_type) DO NOTHING;

  -- Key Staff template
  INSERT INTO public.staff_form_templates (org_id, form_type, fields)
  VALUES (p_org_id, 'key_staff', '[
    {"id": "full_name", "label": "Full Name", "required": true, "enabled": true, "field_type": "text", "order": 0, "locked": true},
    {"id": "preferred_title", "label": "Preferred Title", "required": true, "enabled": true, "field_type": "text", "order": 1, "locked": true},
    {"id": "personal_email", "label": "Email Address", "required": true, "enabled": true, "field_type": "email", "order": 2, "locked": true},
    {"id": "personal_mobile", "label": "Phone Number", "required": true, "enabled": true, "field_type": "phone", "order": 3, "locked": true},
    {"id": "position", "label": "Position Held", "required": true, "enabled": true, "field_type": "text", "order": 4, "locked": true},
    {"id": "home_address", "label": "Home Address", "required": false, "enabled": true, "field_type": "textarea", "order": 5, "locked": false},
    {"id": "date_of_birth", "label": "Date of Birth", "required": false, "enabled": true, "field_type": "date", "order": 6, "locked": false},
    {"id": "public_social_links", "label": "LinkedIn Profile", "required": false, "enabled": true, "field_type": "url", "order": 7, "locked": false},
    {"id": "reports_responsible_for", "label": "Reports Responsible For", "required": false, "enabled": true, "field_type": "textarea", "order": 8, "locked": false},
    {"id": "reports_to", "label": "Reports To", "required": false, "enabled": true, "field_type": "select", "order": 9, "locked": false},
    {"id": "professional_qualifications", "label": "Qualifications", "required": false, "enabled": true, "field_type": "textarea", "order": 10, "locked": false},
    {"id": "conflicts_of_interest", "label": "Conflicts of Interest", "required": false, "enabled": true, "field_type": "textarea", "order": 11, "locked": false},
    {"id": "personal_interests", "label": "Personal Interests/Hobbies", "required": false, "enabled": true, "field_type": "textarea", "order": 12, "locked": false},
    {"id": "health_notes", "label": "Health Issues", "required": false, "enabled": true, "field_type": "textarea", "order": 13, "locked": false},
    {"id": "emergency_contact_name", "label": "Emergency Contact Name", "required": false, "enabled": true, "field_type": "text", "order": 14, "locked": false},
    {"id": "emergency_contact_phone", "label": "Emergency Contact Phone", "required": false, "enabled": true, "field_type": "phone", "order": 15, "locked": false}
  ]'::jsonb)
  ON CONFLICT (org_id, form_type) DO NOTHING;
END;
$$;

-- ----------------------------------------------------------------
-- Migration file: 20251021020819_f67c1c37-426d-4b2c-b6b4-a39256b22621.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251021020819_f67c1c37-426d-4b2c-b6b4-a39256b22621.sql
-- ----------------------------------------------------------------
-- Update default staff form templates to include starting_date and finishing_date
UPDATE staff_form_templates
SET fields = jsonb_set(
  jsonb_set(
    fields,
    '{16}',
    '{"id": "starting_date", "label": "Starting Date", "required": true, "enabled": true, "field_type": "date", "order": 16, "locked": false}'
  ),
  '{17}',
  '{"id": "finishing_date", "label": "Finishing Date", "required": false, "enabled": true, "field_type": "date", "order": 17, "locked": false}'
)
WHERE form_type IN ('board_members', 'executive_team', 'key_staff');

-- Update the create_default_staff_form_templates function to include new fields
CREATE OR REPLACE FUNCTION public.create_default_staff_form_templates(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Board Members template
  INSERT INTO public.staff_form_templates (org_id, form_type, fields)
  VALUES (p_org_id, 'board_members', '[
    {"id": "full_name", "label": "Full Name", "required": true, "enabled": true, "field_type": "text", "order": 0, "locked": true},
    {"id": "preferred_title", "label": "Preferred Title", "required": true, "enabled": true, "field_type": "text", "order": 1, "locked": true},
    {"id": "personal_email", "label": "Email Address", "required": true, "enabled": true, "field_type": "email", "order": 2, "locked": true},
    {"id": "personal_mobile", "label": "Phone Number", "required": true, "enabled": true, "field_type": "phone", "order": 3, "locked": true},
    {"id": "position", "label": "Position Held", "required": true, "enabled": true, "field_type": "text", "order": 4, "locked": true},
    {"id": "starting_date", "label": "Starting Date", "required": true, "enabled": true, "field_type": "date", "order": 5, "locked": false},
    {"id": "finishing_date", "label": "Finishing Date", "required": false, "enabled": true, "field_type": "date", "order": 6, "locked": false},
    {"id": "home_address", "label": "Home Address", "required": false, "enabled": true, "field_type": "textarea", "order": 7, "locked": false},
    {"id": "date_of_birth", "label": "Date of Birth", "required": false, "enabled": true, "field_type": "date", "order": 8, "locked": false},
    {"id": "public_social_links", "label": "LinkedIn Profile", "required": false, "enabled": true, "field_type": "url", "order": 9, "locked": false},
    {"id": "reports_responsible_for", "label": "Reports Responsible For", "required": false, "enabled": true, "field_type": "textarea", "order": 10, "locked": false},
    {"id": "reports_to", "label": "Reports To", "required": false, "enabled": true, "field_type": "select", "order": 11, "locked": false},
    {"id": "professional_qualifications", "label": "Qualifications", "required": false, "enabled": true, "field_type": "textarea", "order": 12, "locked": false},
    {"id": "conflicts_of_interest", "label": "Conflicts of Interest", "required": false, "enabled": true, "field_type": "textarea", "order": 13, "locked": false},
    {"id": "personal_interests", "label": "Personal Interests/Hobbies", "required": false, "enabled": true, "field_type": "textarea", "order": 14, "locked": false},
    {"id": "health_notes", "label": "Health Issues", "required": false, "enabled": true, "field_type": "textarea", "order": 15, "locked": false},
    {"id": "emergency_contact_name", "label": "Emergency Contact Name", "required": false, "enabled": true, "field_type": "text", "order": 16, "locked": false},
    {"id": "emergency_contact_phone", "label": "Emergency Contact Phone", "required": false, "enabled": true, "field_type": "phone", "order": 17, "locked": false}
  ]'::jsonb)
  ON CONFLICT (org_id, form_type) DO UPDATE SET fields = EXCLUDED.fields;

  -- Executive Team template
  INSERT INTO public.staff_form_templates (org_id, form_type, fields)
  VALUES (p_org_id, 'executive_team', '[
    {"id": "full_name", "label": "Full Name", "required": true, "enabled": true, "field_type": "text", "order": 0, "locked": true},
    {"id": "preferred_title", "label": "Preferred Title", "required": true, "enabled": true, "field_type": "text", "order": 1, "locked": true},
    {"id": "personal_email", "label": "Email Address", "required": true, "enabled": true, "field_type": "email", "order": 2, "locked": true},
    {"id": "personal_mobile", "label": "Phone Number", "required": true, "enabled": true, "field_type": "phone", "order": 3, "locked": true},
    {"id": "position", "label": "Position Held", "required": true, "enabled": true, "field_type": "text", "order": 4, "locked": true},
    {"id": "starting_date", "label": "Starting Date", "required": true, "enabled": true, "field_type": "date", "order": 5, "locked": false},
    {"id": "finishing_date", "label": "Finishing Date", "required": false, "enabled": true, "field_type": "date", "order": 6, "locked": false},
    {"id": "home_address", "label": "Home Address", "required": false, "enabled": true, "field_type": "textarea", "order": 7, "locked": false},
    {"id": "date_of_birth", "label": "Date of Birth", "required": false, "enabled": true, "field_type": "date", "order": 8, "locked": false},
    {"id": "public_social_links", "label": "LinkedIn Profile", "required": false, "enabled": true, "field_type": "url", "order": 9, "locked": false},
    {"id": "reports_responsible_for", "label": "Reports Responsible For", "required": false, "enabled": true, "field_type": "textarea", "order": 10, "locked": false},
    {"id": "reports_to", "label": "Reports To", "required": false, "enabled": true, "field_type": "select", "order": 11, "locked": false},
    {"id": "professional_qualifications", "label": "Qualifications", "required": false, "enabled": true, "field_type": "textarea", "order": 12, "locked": false},
    {"id": "conflicts_of_interest", "label": "Conflicts of Interest", "required": false, "enabled": true, "field_type": "textarea", "order": 13, "locked": false},
    {"id": "personal_interests", "label": "Personal Interests/Hobbies", "required": false, "enabled": true, "field_type": "textarea", "order": 14, "locked": false},
    {"id": "health_notes", "label": "Health Issues", "required": false, "enabled": true, "field_type": "textarea", "order": 15, "locked": false},
    {"id": "emergency_contact_name", "label": "Emergency Contact Name", "required": false, "enabled": true, "field_type": "text", "order": 16, "locked": false},
    {"id": "emergency_contact_phone", "label": "Emergency Contact Phone", "required": false, "enabled": true, "field_type": "phone", "order": 17, "locked": false}
  ]'::jsonb)
  ON CONFLICT (org_id, form_type) DO UPDATE SET fields = EXCLUDED.fields;

  -- Key Staff template
  INSERT INTO public.staff_form_templates (org_id, form_type, fields)
  VALUES (p_org_id, 'key_staff', '[
    {"id": "full_name", "label": "Full Name", "required": true, "enabled": true, "field_type": "text", "order": 0, "locked": true},
    {"id": "preferred_title", "label": "Preferred Title", "required": true, "enabled": true, "field_type": "text", "order": 1, "locked": true},
    {"id": "personal_email", "label": "Email Address", "required": true, "enabled": true, "field_type": "email", "order": 2, "locked": true},
    {"id": "personal_mobile", "label": "Phone Number", "required": true, "enabled": true, "field_type": "phone", "order": 3, "locked": true},
    {"id": "position", "label": "Position Held", "required": true, "enabled": true, "field_type": "text", "order": 4, "locked": true},
    {"id": "starting_date", "label": "Starting Date", "required": true, "enabled": true, "field_type": "date", "order": 5, "locked": false},
    {"id": "finishing_date", "label": "Finishing Date", "required": false, "enabled": true, "field_type": "date", "order": 6, "locked": false},
    {"id": "home_address", "label": "Home Address", "required": false, "enabled": true, "field_type": "textarea", "order": 7, "locked": false},
    {"id": "date_of_birth", "label": "Date of Birth", "required": false, "enabled": true, "field_type": "date", "order": 8, "locked": false},
    {"id": "public_social_links", "label": "LinkedIn Profile", "required": false, "enabled": true, "field_type": "url", "order": 9, "locked": false},
    {"id": "reports_responsible_for", "label": "Reports Responsible For", "required": false, "enabled": true, "field_type": "textarea", "order": 10, "locked": false},
    {"id": "reports_to", "label": "Reports To", "required": false, "enabled": true, "field_type": "select", "order": 11, "locked": false},
    {"id": "professional_qualifications", "label": "Qualifications", "required": false, "enabled": true, "field_type": "textarea", "order": 12, "locked": false},
    {"id": "conflicts_of_interest", "label": "Conflicts of Interest", "required": false, "enabled": true, "field_type": "textarea", "order": 13, "locked": false},
    {"id": "personal_interests", "label": "Personal Interests/Hobbies", "required": false, "enabled": true, "field_type": "textarea", "order": 14, "locked": false},
    {"id": "health_notes", "label": "Health Issues", "required": false, "enabled": true, "field_type": "textarea", "order": 15, "locked": false},
    {"id": "emergency_contact_name", "label": "Emergency Contact Name", "required": false, "enabled": true, "field_type": "text", "order": 16, "locked": false},
    {"id": "emergency_contact_phone", "label": "Emergency Contact Phone", "required": false, "enabled": true, "field_type": "phone", "order": 17, "locked": false}
  ]'::jsonb)
  ON CONFLICT (org_id, form_type) DO UPDATE SET fields = EXCLUDED.fields;
END;
$$;

-- ----------------------------------------------------------------
-- Migration file: 20251021054234_ad895bf3-d1d5-421c-a595-b83cf3746b93.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251021054234_ad895bf3-d1d5-421c-a595-b83cf3746b93.sql
-- ----------------------------------------------------------------
-- Add custom_fields column to board_members to store custom field data
ALTER TABLE board_members 
ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN board_members.custom_fields IS 'Stores custom field data defined in staff form templates';

-- ----------------------------------------------------------------
-- Migration file: 20251021070202_ea72fd67-933f-4587-913b-08f6b156b5d2.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251021070202_ea72fd67-933f-4587-913b-08f6b156b5d2.sql
-- ----------------------------------------------------------------
-- Create storage bucket for executive reports
INSERT INTO storage.buckets (id, name, public)
VALUES ('executive-reports', 'executive-reports', false) ON CONFLICT (id) DO NOTHING;

-- Create executive_reports table
CREATE TABLE public.executive_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  uploaded_by_name TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  period_covered TEXT NOT NULL,
  board_id UUID REFERENCES public.boards(id),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.executive_reports ENABLE ROW LEVEL SECURITY;

-- Users can view reports in their organization
ALTER TABLE public.executive_reports DROP POLICY IF EXISTS "Users can view reports in their org";
CREATE POLICY "Users can view reports in their org"
ON public.executive_reports
FOR SELECT
USING (
  org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  )
);

-- Users can upload reports to their organization
ALTER TABLE public.executive_reports DROP POLICY IF EXISTS "Users can upload reports";
CREATE POLICY "Users can upload reports"
ON public.executive_reports
FOR INSERT
WITH CHECK (
  uploaded_by = auth.uid() AND
  org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  )
);

-- Users can update their own reports
ALTER TABLE public.executive_reports DROP POLICY IF EXISTS "Users can update their own reports";
CREATE POLICY "Users can update their own reports"
ON public.executive_reports
FOR UPDATE
USING (uploaded_by = auth.uid());

-- Admins can update any report in their org
ALTER TABLE public.executive_reports DROP POLICY IF EXISTS "Admins can update reports";
CREATE POLICY "Admins can update reports"
ON public.executive_reports
FOR UPDATE
USING (
  has_role(auth.uid(), 'org_admin'::app_role) OR 
  has_role(auth.uid(), 'chair'::app_role)
);

-- Storage policies for executive reports bucket
ALTER TABLE storage.objects DROP POLICY IF EXISTS "Users can upload reports to their org folder";
CREATE POLICY "Users can upload reports to their org folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'executive-reports' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

ALTER TABLE storage.objects DROP POLICY IF EXISTS "Users can view reports in their org";
CREATE POLICY "Users can view reports in their org"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'executive-reports' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
  )
);

ALTER TABLE storage.objects DROP POLICY IF EXISTS "Users can delete their own reports";
CREATE POLICY "Users can delete their own reports"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'executive-reports' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create index for better query performance
CREATE INDEX idx_executive_reports_org_id ON public.executive_reports(org_id);
CREATE INDEX idx_executive_reports_board_id ON public.executive_reports(board_id);
CREATE INDEX idx_executive_reports_report_type ON public.executive_reports(report_type);

-- ----------------------------------------------------------------
-- Migration file: 20251021070616_c6a66b90-9865-49d9-b54d-b7df04584584.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251021070616_c6a66b90-9865-49d9-b54d-b7df04584584.sql
-- ----------------------------------------------------------------
-- Create storage bucket for meeting minutes
INSERT INTO storage.buckets (id, name, public)
VALUES ('meeting-minutes', 'meeting-minutes', false) ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for special papers
INSERT INTO storage.buckets (id, name, public)
VALUES ('special-papers', 'special-papers', false) ON CONFLICT (id) DO NOTHING;

-- Create meeting_minutes table
CREATE TABLE public.meeting_minutes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_date DATE NOT NULL,
  meeting_type TEXT NOT NULL DEFAULT 'Regular Board Meeting',
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  uploaded_by_name TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'draft',
  board_id UUID REFERENCES public.boards(id),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create special_papers table
CREATE TABLE public.special_papers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  uploaded_by_name TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  board_id UUID REFERENCES public.boards(id),
  org_id UUID NOT NULL REFERENCES public.organizations(id),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on meeting_minutes
ALTER TABLE public.meeting_minutes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.meeting_minutes DROP POLICY IF EXISTS "Users can view minutes in their org";
CREATE POLICY "Users can view minutes in their org"
ON public.meeting_minutes FOR SELECT
USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

ALTER TABLE public.meeting_minutes DROP POLICY IF EXISTS "Users can upload minutes";
CREATE POLICY "Users can upload minutes"
ON public.meeting_minutes FOR INSERT
WITH CHECK (uploaded_by = auth.uid() AND org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

ALTER TABLE public.meeting_minutes DROP POLICY IF EXISTS "Users can update their own minutes";
CREATE POLICY "Users can update their own minutes"
ON public.meeting_minutes FOR UPDATE
USING (uploaded_by = auth.uid());

ALTER TABLE public.meeting_minutes DROP POLICY IF EXISTS "Admins can update minutes";
CREATE POLICY "Admins can update minutes"
ON public.meeting_minutes FOR UPDATE
USING (has_role(auth.uid(), 'org_admin'::app_role) OR has_role(auth.uid(), 'chair'::app_role));

-- Enable RLS on special_papers
ALTER TABLE public.special_papers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.special_papers DROP POLICY IF EXISTS "Users can view special papers in their org";
CREATE POLICY "Users can view special papers in their org"
ON public.special_papers FOR SELECT
USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

ALTER TABLE public.special_papers DROP POLICY IF EXISTS "Users can upload special papers";
CREATE POLICY "Users can upload special papers"
ON public.special_papers FOR INSERT
WITH CHECK (uploaded_by = auth.uid() AND org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

ALTER TABLE public.special_papers DROP POLICY IF EXISTS "Users can update their own special papers";
CREATE POLICY "Users can update their own special papers"
ON public.special_papers FOR UPDATE
USING (uploaded_by = auth.uid());

ALTER TABLE public.special_papers DROP POLICY IF EXISTS "Admins can update special papers";
CREATE POLICY "Admins can update special papers"
ON public.special_papers FOR UPDATE
USING (has_role(auth.uid(), 'org_admin'::app_role) OR has_role(auth.uid(), 'chair'::app_role));

-- Storage policies for meeting-minutes bucket
ALTER TABLE storage.objects DROP POLICY IF EXISTS "Users can upload minutes to their org folder";
CREATE POLICY "Users can upload minutes to their org folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'meeting-minutes' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

ALTER TABLE storage.objects DROP POLICY IF EXISTS "Users can view minutes in their org";
CREATE POLICY "Users can view minutes in their org"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'meeting-minutes' AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
);

ALTER TABLE storage.objects DROP POLICY IF EXISTS "Users can delete their own minutes";
CREATE POLICY "Users can delete their own minutes"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'meeting-minutes' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for special-papers bucket
ALTER TABLE storage.objects DROP POLICY IF EXISTS "Users can upload special papers to their org folder";
CREATE POLICY "Users can upload special papers to their org folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'special-papers' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

ALTER TABLE storage.objects DROP POLICY IF EXISTS "Users can view special papers in their org";
CREATE POLICY "Users can view special papers in their org"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'special-papers' AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
);

ALTER TABLE storage.objects DROP POLICY IF EXISTS "Users can delete their own special papers";
CREATE POLICY "Users can delete their own special papers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'special-papers' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create indexes
CREATE INDEX idx_meeting_minutes_org_id ON public.meeting_minutes(org_id);
CREATE INDEX idx_meeting_minutes_meeting_date ON public.meeting_minutes(meeting_date);
CREATE INDEX idx_special_papers_org_id ON public.special_papers(org_id);
CREATE INDEX idx_special_papers_deadline ON public.special_papers(deadline);

-- ----------------------------------------------------------------
-- Migration file: 20251021072106_39454fb5-feaa-4e93-bef8-e9529d930816.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251021072106_39454fb5-feaa-4e93-bef8-e9529d930816.sql
-- ----------------------------------------------------------------
-- Create board paper templates table for custom templates
CREATE TABLE IF NOT EXISTS public.board_paper_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL,
  company_name TEXT,
  logo_url TEXT,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(org_id, template_name, template_type)
);

ALTER TABLE public.board_paper_templates ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.board_paper_templates DROP POLICY IF EXISTS "Users can view their org templates";
CREATE POLICY "Users can view their org templates"
ON public.board_paper_templates
FOR SELECT
USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.board_paper_templates DROP POLICY IF EXISTS "Users can insert templates";
CREATE POLICY "Users can insert templates"
ON public.board_paper_templates
FOR INSERT
WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  AND created_by = auth.uid()
);

ALTER TABLE public.board_paper_templates DROP POLICY IF EXISTS "Users can update their org templates";
CREATE POLICY "Users can update their org templates"
ON public.board_paper_templates
FOR UPDATE
USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.board_paper_templates DROP POLICY IF EXISTS "Users can delete their org templates";
CREATE POLICY "Users can delete their org templates"
ON public.board_paper_templates
FOR DELETE
USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

DROP TRIGGER IF EXISTS update_board_paper_templates_updated_at ON public.board_paper_templates;
CREATE TRIGGER update_board_paper_templates_updated_at
BEFORE UPDATE ON public.board_paper_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create user_roles table for proper RBAC
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role, org_id, board_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_roles DROP POLICY IF EXISTS "Users can view their own roles";
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

ALTER TABLE public.user_roles DROP POLICY IF EXISTS "System can insert roles";
CREATE POLICY "System can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (true);

-- Function to assign default observer role to new users
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Assign observer role by default to new profiles
  IF NEW.org_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, org_id)
    VALUES (NEW.id, 'observer'::app_role, NEW.org_id)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS assign_default_role_trigger ON public.profiles;

DROP TRIGGER IF EXISTS assign_default_role_trigger ON public.profiles;
CREATE TRIGGER assign_default_role_trigger
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.assign_default_role();

-- ----------------------------------------------------------------
-- Migration file: 20251021074407_99730a1c-1399-49d0-bcb7-39b29f3af602.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251021074407_99730a1c-1399-49d0-bcb7-39b29f3af602.sql
-- ----------------------------------------------------------------
-- Two-person approval system
CREATE TABLE IF NOT EXISTS public.approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  first_approver UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_approved_at TIMESTAMP WITH TIME ZONE,
  second_approver UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  second_approved_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',
  request_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT different_approvers CHECK (first_approver IS NULL OR second_approver IS NULL OR first_approver != second_approver),
  CONSTRAINT status_check CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'))
);

-- Enable RLS
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

-- Policies for approval requests
ALTER TABLE public.approval_requests DROP POLICY IF EXISTS "Users can view approval requests in their org";
CREATE POLICY "Users can view approval requests in their org"
  ON public.approval_requests FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.approval_requests DROP POLICY IF EXISTS "Users can create approval requests";
CREATE POLICY "Users can create approval requests"
  ON public.approval_requests FOR INSERT
  WITH CHECK (
    requested_by = auth.uid() AND
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

ALTER TABLE public.approval_requests DROP POLICY IF EXISTS "Approvers can update approval requests";
CREATE POLICY "Approvers can update approval requests"
  ON public.approval_requests FOR UPDATE
  USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()) AND
    (has_role(auth.uid(), 'org_admin'::app_role) OR has_role(auth.uid(), 'chair'::app_role))
  );

-- Admin hierarchy table
CREATE TABLE IF NOT EXISTS public.org_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_type TEXT NOT NULL CHECK (admin_type IN ('primary', 'secondary')),
  appointed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  appointed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(org_id, admin_type),
  UNIQUE(org_id, user_id)
);

-- Enable RLS
ALTER TABLE public.org_admins ENABLE ROW LEVEL SECURITY;

-- Policies for org_admins
ALTER TABLE public.org_admins DROP POLICY IF EXISTS "Users can view admins in their org";
CREATE POLICY "Users can view admins in their org"
  ON public.org_admins FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

ALTER TABLE public.org_admins DROP POLICY IF EXISTS "Org admins can manage admin assignments";
CREATE POLICY "Org admins can manage admin assignments"
  ON public.org_admins FOR ALL
  USING (has_role(auth.uid(), 'org_admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- DROP TRIGGER IF EXISTS for ON public.approval_requests;
Create trigger for updated_at
CREATE TRIGGER update_approval_requests_updated_at
  BEFORE UPDATE ON public.approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indices for performance
CREATE INDEX idx_approval_requests_org_id ON public.approval_requests(org_id);
CREATE INDEX idx_approval_requests_status ON public.approval_requests(status);
CREATE INDEX idx_approval_requests_requested_by ON public.approval_requests(requested_by);
CREATE INDEX idx_org_admins_org_id ON public.org_admins(org_id);

-- ----------------------------------------------------------------
-- Migration file: 20251021080033_d415fcb1-3ed3-4878-8348-154a6c807352.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251021080033_d415fcb1-3ed3-4878-8348-154a6c807352.sql
-- ----------------------------------------------------------------
-- Add board type and archiving support
ALTER TABLE boards 
ADD COLUMN IF NOT EXISTS board_type text DEFAULT 'main' CHECK (board_type IN ('main', 'sub_committee', 'special_purpose')),
ADD COLUMN IF NOT EXISTS parent_board_id uuid REFERENCES boards(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'archived')),
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS committee_purpose text;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_boards_status ON boards(status);
CREATE INDEX IF NOT EXISTS idx_boards_parent ON boards(parent_board_id);
CREATE INDEX IF NOT EXISTS idx_boards_org_status ON boards(org_id, status);

-- Add RLS policy for board creation
CREATE POLICY "Org admins can create boards"
ON boards FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'org_admin'::app_role) 
  AND org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);

-- Add RLS policy for board updates
CREATE POLICY "Org admins can update boards"
ON boards FOR UPDATE
USING (
  has_role(auth.uid(), 'org_admin'::app_role)
  AND org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);

-- Add RLS policy for board deletion (archiving)
CREATE POLICY "Org admins can delete boards"
ON boards FOR DELETE
USING (
  has_role(auth.uid(), 'org_admin'::app_role)
  AND org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);

-- ----------------------------------------------------------------
-- Migration file: 20251021080834_4d2473d9-43c3-4c22-8bed-b6d14422017d.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251021080834_4d2473d9-43c3-4c22-8bed-b6d14422017d.sql
-- ----------------------------------------------------------------
-- Temporarily relax the boards RLS policies to allow org members to manage boards
-- This can be tightened later once admin roles are properly assigned

-- Drop the strict admin-only policies
DROP POLICY IF EXISTS "Org admins can create boards" ON boards;
DROP POLICY IF EXISTS "Org admins can update boards" ON boards;
DROP POLICY IF EXISTS "Org admins can delete boards" ON boards;

-- Create more permissive policies for org members
CREATE POLICY "Org members can create boards"
ON boards FOR INSERT
WITH CHECK (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Org members can update boards"
ON boards FOR UPDATE
USING (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "Org members can delete boards"
ON boards FOR DELETE
USING (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);

-- ----------------------------------------------------------------
-- Migration file: 20251026063942_3b952029-8e71-4668-a445-7f7b8a3889ec.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251026063942_3b952029-8e71-4668-a445-7f7b8a3889ec.sql
-- ----------------------------------------------------------------
-- Fix unrestricted organization creation vulnerability
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can insert organizations" ON organizations;

-- Create a more restrictive policy that only allows users without an org to create one
CREATE POLICY "Restrict org creation to users without org" ON organizations
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM profiles WHERE org_id IS NULL
  )
);

-- ----------------------------------------------------------------
-- Migration file: 20251026064957_5f6da396-26fc-43a8-9a5f-aba3293ea2a1.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251026064957_5f6da396-26fc-43a8-9a5f-aba3293ea2a1.sql
-- ----------------------------------------------------------------
-- Fix mutable search_path in security definer functions
-- This prevents search path injection attacks by fixing the search_path for all SECURITY DEFINER functions

-- Fix calculate_next_due_date function
CREATE OR REPLACE FUNCTION public.calculate_next_due_date(last_date date, freq compliance_frequency)
RETURNS date
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN CASE freq
    WHEN 'daily' THEN last_date + INTERVAL '1 day'
    WHEN 'weekly' THEN last_date + INTERVAL '1 week'
    WHEN 'monthly' THEN last_date + INTERVAL '1 month'
    WHEN 'quarterly' THEN last_date + INTERVAL '3 months'
    WHEN 'semi_annual' THEN last_date + INTERVAL '6 months'
    WHEN 'annual' THEN last_date + INTERVAL '1 year'
    WHEN 'biennial' THEN last_date + INTERVAL '2 years'
    ELSE NULL
  END;
END;
$$;

-- Fix trigger_compliance_scan function
CREATE OR REPLACE FUNCTION public.trigger_compliance_scan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark that a scan is needed when industry or category changes
  IF (NEW.industry_sector IS DISTINCT FROM OLD.industry_sector) OR 
     (NEW.business_category IS DISTINCT FROM OLD.business_category) THEN
    NEW.compliance_scan_completed = false;
    NEW.compliance_scan_date = NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Fix log_submission_review function
CREATE OR REPLACE FUNCTION public.log_submission_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.audit_log (
      entity_type, 
      entity_id, 
      actor_id, 
      action, 
      detail_json,
      timestamp
    ) VALUES (
      'document_submission',
      NEW.id,
      auth.uid(),
      'submission_reviewed',
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'comments', NEW.comments,
        'reviewed_by', NEW.reviewed_by
      ),
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Fix generate_member_invite_token function
CREATE OR REPLACE FUNCTION public.generate_member_invite_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$;

-- ----------------------------------------------------------------
-- Migration file: 20251026065410_6ef9f906-a256-4ab2-a9a6-83cbbd9c54ef.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251026065410_6ef9f906-a256-4ab2-a9a6-83cbbd9c54ef.sql
-- ----------------------------------------------------------------
-- Fix mutable search_path in create_default_staff_form_templates function
-- This prevents search path injection attacks

CREATE OR REPLACE FUNCTION public.create_default_staff_form_templates(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Board Members template
  INSERT INTO public.staff_form_templates (org_id, form_type, fields)
  VALUES (p_org_id, 'board_members', '[
    {"id": "full_name", "label": "Full Name", "required": true, "enabled": true, "field_type": "text", "order": 0, "locked": true},
    {"id": "preferred_title", "label": "Preferred Title", "required": true, "enabled": true, "field_type": "text", "order": 1, "locked": true},
    {"id": "personal_email", "label": "Email Address", "required": true, "enabled": true, "field_type": "email", "order": 2, "locked": true},
    {"id": "personal_mobile", "label": "Phone Number", "required": true, "enabled": true, "field_type": "phone", "order": 3, "locked": true},
    {"id": "position", "label": "Position Held", "required": true, "enabled": true, "field_type": "text", "order": 4, "locked": true},
    {"id": "starting_date", "label": "Starting Date", "required": true, "enabled": true, "field_type": "date", "order": 5, "locked": false},
    {"id": "finishing_date", "label": "Finishing Date", "required": false, "enabled": true, "field_type": "date", "order": 6, "locked": false},
    {"id": "home_address", "label": "Home Address", "required": false, "enabled": true, "field_type": "textarea", "order": 7, "locked": false},
    {"id": "date_of_birth", "label": "Date of Birth", "required": false, "enabled": true, "field_type": "date", "order": 8, "locked": false},
    {"id": "public_social_links", "label": "LinkedIn Profile", "required": false, "enabled": true, "field_type": "url", "order": 9, "locked": false},
    {"id": "reports_responsible_for", "label": "Reports Responsible For", "required": false, "enabled": true, "field_type": "textarea", "order": 10, "locked": false},
    {"id": "reports_to", "label": "Reports To", "required": false, "enabled": true, "field_type": "select", "order": 11, "locked": false},
    {"id": "professional_qualifications", "label": "Qualifications", "required": false, "enabled": true, "field_type": "textarea", "order": 12, "locked": false},
    {"id": "conflicts_of_interest", "label": "Conflicts of Interest", "required": false, "enabled": true, "field_type": "textarea", "order": 13, "locked": false},
    {"id": "personal_interests", "label": "Personal Interests/Hobbies", "required": false, "enabled": true, "field_type": "textarea", "order": 14, "locked": false},
    {"id": "health_notes", "label": "Health Issues", "required": false, "enabled": true, "field_type": "textarea", "order": 15, "locked": false},
    {"id": "emergency_contact_name", "label": "Emergency Contact Name", "required": false, "enabled": true, "field_type": "text", "order": 16, "locked": false},
    {"id": "emergency_contact_phone", "label": "Emergency Contact Phone", "required": false, "enabled": true, "field_type": "phone", "order": 17, "locked": false}
  ]'::jsonb)
  ON CONFLICT (org_id, form_type) DO UPDATE SET fields = EXCLUDED.fields;

  -- Executive Team template
  INSERT INTO public.staff_form_templates (org_id, form_type, fields)
  VALUES (p_org_id, 'executive_team', '[
    {"id": "full_name", "label": "Full Name", "required": true, "enabled": true, "field_type": "text", "order": 0, "locked": true},
    {"id": "preferred_title", "label": "Preferred Title", "required": true, "enabled": true, "field_type": "text", "order": 1, "locked": true},
    {"id": "personal_email", "label": "Email Address", "required": true, "enabled": true, "field_type": "email", "order": 2, "locked": true},
    {"id": "personal_mobile", "label": "Phone Number", "required": true, "enabled": true, "field_type": "phone", "order": 3, "locked": true},
    {"id": "position", "label": "Position Held", "required": true, "enabled": true, "field_type": "text", "order": 4, "locked": true},
    {"id": "starting_date", "label": "Starting Date", "required": true, "enabled": true, "field_type": "date", "order": 5, "locked": false},
    {"id": "finishing_date", "label": "Finishing Date", "required": false, "enabled": true, "field_type": "date", "order": 6, "locked": false},
    {"id": "home_address", "label": "Home Address", "required": false, "enabled": true, "field_type": "textarea", "order": 7, "locked": false},
    {"id": "date_of_birth", "label": "Date of Birth", "required": false, "enabled": true, "field_type": "date", "order": 8, "locked": false},
    {"id": "public_social_links", "label": "LinkedIn Profile", "required": false, "enabled": true, "field_type": "url", "order": 9, "locked": false},
    {"id": "reports_responsible_for", "label": "Reports Responsible For", "required": false, "enabled": true, "field_type": "textarea", "order": 10, "locked": false},
    {"id": "reports_to", "label": "Reports To", "required": false, "enabled": true, "field_type": "select", "order": 11, "locked": false},
    {"id": "professional_qualifications", "label": "Qualifications", "required": false, "enabled": true, "field_type": "textarea", "order": 12, "locked": false},
    {"id": "conflicts_of_interest", "label": "Conflicts of Interest", "required": false, "enabled": true, "field_type": "textarea", "order": 13, "locked": false},
    {"id": "personal_interests", "label": "Personal Interests/Hobbies", "required": false, "enabled": true, "field_type": "textarea", "order": 14, "locked": false},
    {"id": "health_notes", "label": "Health Issues", "required": false, "enabled": true, "field_type": "textarea", "order": 15, "locked": false},
    {"id": "emergency_contact_name", "label": "Emergency Contact Name", "required": false, "enabled": true, "field_type": "text", "order": 16, "locked": false},
    {"id": "emergency_contact_phone", "label": "Emergency Contact Phone", "required": false, "enabled": true, "field_type": "phone", "order": 17, "locked": false}
  ]'::jsonb)
  ON CONFLICT (org_id, form_type) DO UPDATE SET fields = EXCLUDED.fields;

  -- Key Staff template
  INSERT INTO public.staff_form_templates (org_id, form_type, fields)
  VALUES (p_org_id, 'key_staff', '[
    {"id": "full_name", "label": "Full Name", "required": true, "enabled": true, "field_type": "text", "order": 0, "locked": true},
    {"id": "preferred_title", "label": "Preferred Title", "required": true, "enabled": true, "field_type": "text", "order": 1, "locked": true},
    {"id": "personal_email", "label": "Email Address", "required": true, "enabled": true, "field_type": "email", "order": 2, "locked": true},
    {"id": "personal_mobile", "label": "Phone Number", "required": true, "enabled": true, "field_type": "phone", "order": 3, "locked": true},
    {"id": "position", "label": "Position Held", "required": true, "enabled": true, "field_type": "text", "order": 4, "locked": true},
    {"id": "starting_date", "label": "Starting Date", "required": true, "enabled": true, "field_type": "date", "order": 5, "locked": false},
    {"id": "finishing_date", "label": "Finishing Date", "required": false, "enabled": true, "field_type": "date", "order": 6, "locked": false},
    {"id": "home_address", "label": "Home Address", "required": false, "enabled": true, "field_type": "textarea", "order": 7, "locked": false},
    {"id": "date_of_birth", "label": "Date of Birth", "required": false, "enabled": true, "field_type": "date", "order": 8, "locked": false},
    {"id": "public_social_links", "label": "LinkedIn Profile", "required": false, "enabled": true, "field_type": "url", "order": 9, "locked": false},
    {"id": "reports_responsible_for", "label": "Reports Responsible For", "required": false, "enabled": true, "field_type": "textarea", "order": 10, "locked": false},
    {"id": "reports_to", "label": "Reports To", "required": false, "enabled": true, "field_type": "select", "order": 11, "locked": false},
    {"id": "professional_qualifications", "label": "Qualifications", "required": false, "enabled": true, "field_type": "textarea", "order": 12, "locked": false},
    {"id": "conflicts_of_interest", "label": "Conflicts of Interest", "required": false, "enabled": true, "field_type": "textarea", "order": 13, "locked": false},
    {"id": "personal_interests", "label": "Personal Interests/Hobbies", "required": false, "enabled": true, "field_type": "textarea", "order": 14, "locked": false},
    {"id": "health_notes", "label": "Health Issues", "required": false, "enabled": true, "field_type": "textarea", "order": 15, "locked": false},
    {"id": "emergency_contact_name", "label": "Emergency Contact Name", "required": false, "enabled": true, "field_type": "text", "order": 16, "locked": false},
    {"id": "emergency_contact_phone", "label": "Emergency Contact Phone", "required": false, "enabled": true, "field_type": "phone", "order": 17, "locked": false}
  ]'::jsonb)
  ON CONFLICT (org_id, form_type) DO UPDATE SET fields = EXCLUDED.fields;
END;
$$;

-- ----------------------------------------------------------------
-- Migration file: 20251026070633_aa0165d0-c7c4-407b-a418-88909dbf47df.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251026070633_aa0165d0-c7c4-407b-a418-88909dbf47df.sql
-- ----------------------------------------------------------------
-- Fix 1: Remove privilege escalation vulnerability in user_roles
-- Drop the dangerous "System can insert roles" policy
DROP POLICY IF EXISTS "System can insert roles" ON public.user_roles;

-- Create secure policy: Only org_admin and super_admin can assign roles
ALTER TABLE public.user_roles DROP POLICY IF EXISTS "Only admins can assign roles";
CREATE POLICY "Only admins can assign roles" 
ON public.user_roles
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'org_admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Create secure policy: Only admins can modify roles
ALTER TABLE public.user_roles DROP POLICY IF EXISTS "Only admins can modify roles";
CREATE POLICY "Only admins can modify roles" 
ON public.user_roles
FOR UPDATE 
USING (
  has_role(auth.uid(), 'org_admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Create secure policy: Only admins can delete roles
ALTER TABLE public.user_roles DROP POLICY IF EXISTS "Only admins can delete roles";
CREATE POLICY "Only admins can delete roles" 
ON public.user_roles
FOR DELETE 
USING (
  has_role(auth.uid(), 'org_admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Fix 2: Secure audit_log table - make system-only
DROP POLICY IF EXISTS "System can create audit logs" ON public.audit_log;

-- Create SECURITY DEFINER function for controlled audit logging
CREATE OR REPLACE FUNCTION public.log_audit_entry(
  _entity_type text,
  _entity_id uuid,
  _action text,
  _detail_json jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (
    entity_type,
    entity_id,
    actor_id,
    action,
    detail_json,
    timestamp
  ) VALUES (
    _entity_type,
    _entity_id,
    auth.uid(),
    _action,
    _detail_json,
    now()
  );
END;
$$;

-- Fix 3: Secure board_member_audit table
DROP POLICY IF EXISTS "System can create audit logs" ON public.board_member_audit;

-- Create SECURITY DEFINER function for board member audit logging
CREATE OR REPLACE FUNCTION public.log_board_member_audit(
  _member_id uuid,
  _field_name text,
  _change_type text,
  _old_value text DEFAULT NULL,
  _new_value text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.board_member_audit (
    member_id,
    changed_by,
    field_name,
    change_type,
    old_value,
    new_value,
    timestamp
  ) VALUES (
    _member_id,
    auth.uid(),
    _field_name,
    _change_type,
    _old_value,
    _new_value,
    now()
  );
END;
$$;

-- Fix 4: Secure document_embeddings table
DROP POLICY IF EXISTS "System can create embeddings" ON public.document_embeddings;

-- Only allow through edge functions via service role (no user insert policy)

-- Fix 5: Secure document_links table
DROP POLICY IF EXISTS "System can create document links" ON public.document_links;

-- Only allow through edge functions via service role (no user insert policy)

-- Fix 6: Secure document_snapshots with proper validation
DROP POLICY IF EXISTS "Users can insert document snapshots" ON public.document_snapshots;

ALTER TABLE public.document_snapshots DROP POLICY IF EXISTS "Authenticated users can create snapshots";
CREATE POLICY "Authenticated users can create snapshots"
ON public.document_snapshots
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- ----------------------------------------------------------------
-- Migration file: 20251026070747_0741d017-0b5e-45b4-85de-4eede01b7ed2.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251026070747_0741d017-0b5e-45b4-85de-4eede01b7ed2.sql
-- ----------------------------------------------------------------
-- Update the cron job to include the secret header
SELECT cron.unschedule('send-annual-review-reminders');

SELECT cron.schedule(
  'send-annual-review-reminders',
  '0 9 1 * *', -- Run at 9 AM on the 1st of each month
  $$
  SELECT
    net.http_post(
        url:='https://lomksomekpysjgtnlguq.supabase.co/functions/v1/send-annual-review',
        headers:='{"Content-Type": "application/json", "x-cron-secret": "default-secret-change-me"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);

-- ----------------------------------------------------------------
-- Migration file: 20251030041215_4b5808fd-ddf3-4e79-8668-db1cee9eaf90.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251030041215_4b5808fd-ddf3-4e79-8668-db1cee9eaf90.sql
-- ----------------------------------------------------------------
-- Dashboard Templates: stores dashboard configurations
CREATE TABLE dashboard_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  layout_json JSONB NOT NULL DEFAULT '{"widgets": [], "grid": {"columns": 12, "rowHeight": 100}}'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Dashboard Widgets: stores individual widget configurations
CREATE TABLE dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES dashboard_templates(id) ON DELETE CASCADE,
  widget_type TEXT NOT NULL CHECK (widget_type IN ('kpi_card', 'line_chart', 'bar_chart', 'table', 'traffic_light', 'gauge')),
  title TEXT NOT NULL,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  width INTEGER NOT NULL DEFAULT 4,
  height INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Dashboard Metrics: stores actual metric data with provenance
CREATE TABLE dashboard_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('financial', 'health_safety', 'hr', 'sales', 'projects', 'compliance', 'governance')),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC,
  metric_unit TEXT,
  period_type TEXT NOT NULL CHECK (period_type IN ('current', 'mtd', 'qtd', 'ytd', 'custom')) DEFAULT 'current',
  period_start DATE,
  period_end DATE,
  data_source TEXT NOT NULL,
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata_json JSONB DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_dashboard_templates_org ON dashboard_templates(org_id);
CREATE INDEX idx_dashboard_widgets_template ON dashboard_widgets(template_id);
CREATE INDEX idx_dashboard_metrics_org ON dashboard_metrics(org_id);
CREATE INDEX idx_dashboard_metrics_category ON dashboard_metrics(category, period_type);

-- RLS Policies
ALTER TABLE dashboard_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_metrics ENABLE ROW LEVEL SECURITY;

-- Users can view templates in their org
CREATE POLICY "Users can view org templates"
ON dashboard_templates FOR SELECT
USING (org_id IN (
  SELECT org_id FROM profiles WHERE id = auth.uid()
));

-- Users can create templates in their org
CREATE POLICY "Users can create templates"
ON dashboard_templates FOR INSERT
WITH CHECK (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  AND created_by = auth.uid()
);

-- Users can update templates in their org
CREATE POLICY "Users can update org templates"
ON dashboard_templates FOR UPDATE
USING (org_id IN (
  SELECT org_id FROM profiles WHERE id = auth.uid()
));

-- Users can delete templates they created
CREATE POLICY "Users can delete own templates"
ON dashboard_templates FOR DELETE
USING (created_by = auth.uid());

-- Widget policies (inherit from template)
CREATE POLICY "Users can view widgets"
ON dashboard_widgets FOR SELECT
USING (template_id IN (
  SELECT id FROM dashboard_templates 
  WHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
));

CREATE POLICY "Users can manage widgets"
ON dashboard_widgets FOR ALL
USING (template_id IN (
  SELECT id FROM dashboard_templates 
  WHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
));

-- Metrics policies
CREATE POLICY "Users can view org metrics"
ON dashboard_metrics FOR SELECT
USING (org_id IN (
  SELECT org_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can create metrics"
ON dashboard_metrics FOR INSERT
WITH CHECK (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
  AND created_by = auth.uid()
);

CREATE POLICY "Users can update org metrics"
ON dashboard_metrics FOR UPDATE
USING (org_id IN (
  SELECT org_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can delete own metrics"
ON dashboard_metrics FOR DELETE
USING (created_by = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_dashboard_templates_updated_at
  BEFORE UPDATE ON dashboard_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dashboard_widgets_updated_at
  BEFORE UPDATE ON dashboard_widgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dashboard_metrics_updated_at
  BEFORE UPDATE ON dashboard_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------
-- Migration file: 20251030051317_21532d08-0054-40a2-b651-3fe0eaa1741d.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251030051317_21532d08-0054-40a2-b651-3fe0eaa1741d.sql
-- ----------------------------------------------------------------
-- Drop the old check constraint
ALTER TABLE dashboard_widgets DROP CONSTRAINT IF EXISTS dashboard_widgets_widget_type_check;

-- Add updated check constraint with all widget types used in the builder
ALTER TABLE dashboard_widgets ADD CONSTRAINT dashboard_widgets_widget_type_check 
CHECK (widget_type = ANY (ARRAY[
  'kpi',
  'kpi_card',
  'line',
  'line_chart',
  'bar',
  'bar_chart',
  'pie',
  'pie_chart',
  'table',
  'traffic-light',
  'traffic_light',
  'gauge'
]));

-- ----------------------------------------------------------------
-- Migration file: 20251030061012_29eab321-1717-4ff3-83f4-1bc0eae0d783.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251030061012_29eab321-1717-4ff3-83f4-1bc0eae0d783.sql
-- ----------------------------------------------------------------
-- Drop existing INSERT policy and recreate with proper permissions
DROP POLICY IF EXISTS "Org members can create boards" ON public.boards;

-- Allow authenticated users to create boards in their organization
ALTER TABLE public.boards DROP POLICY IF EXISTS "Org members can create boards";
CREATE POLICY "Org members can create boards"
ON public.boards
FOR INSERT
TO authenticated
WITH CHECK (
  org_id IN (
    SELECT org_id 
    FROM public.profiles 
    WHERE id = auth.uid() 
    AND org_id IS NOT NULL
  )
);

-- ----------------------------------------------------------------
-- Migration file: 20251030061213_9bc50d28-758a-4cce-aba4-d3433ec93d03.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251030061213_9bc50d28-758a-4cce-aba4-d3433ec93d03.sql
-- ----------------------------------------------------------------
-- Drop the problematic policy
DROP POLICY IF EXISTS "Org members can create boards" ON public.boards;

-- Recreate the policy with a simpler check that doesn't cause recursion
-- Since profiles SELECT policy allows users to view their own profile,
-- we can just check the org_id directly
ALTER TABLE public.boards DROP POLICY IF EXISTS "Org members can create boards";
CREATE POLICY "Org members can create boards"
ON public.boards
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.org_id = boards.org_id
  )
);

-- ----------------------------------------------------------------
-- Migration file: 20251030061418_c0e43cd1-9f02-4ca4-93f8-8964699e049f.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251030061418_c0e43cd1-9f02-4ca4-93f8-8964699e049f.sql
-- ----------------------------------------------------------------
-- Drop the problematic policy
DROP POLICY IF EXISTS "Org members can create boards" ON public.boards;

-- Use the existing security definer function to avoid RLS recursion
ALTER TABLE public.boards DROP POLICY IF EXISTS "Org members can create boards";
CREATE POLICY "Org members can create boards"
ON public.boards
FOR INSERT
TO authenticated
WITH CHECK (
  public.get_user_org_id(auth.uid()) = org_id
);

-- ----------------------------------------------------------------
-- Migration file: 20251030061917_0a67c16f-55f8-4b5a-be4a-d0a74dac5585.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251030061917_0a67c16f-55f8-4b5a-be4a-d0a74dac5585.sql
-- ----------------------------------------------------------------
-- Grant INSERT privilege to authenticated users on boards table
GRANT INSERT ON public.boards TO authenticated;

-- Verify the RLS policy is correctly set up
DROP POLICY IF EXISTS "Org members can create boards" ON public.boards;

ALTER TABLE public.boards DROP POLICY IF EXISTS "Org members can create boards";
CREATE POLICY "Org members can create boards"
ON public.boards
FOR INSERT
TO authenticated
WITH CHECK (
  org_id = public.get_user_org_id(auth.uid())
);

-- ----------------------------------------------------------------
-- Migration file: 20251030092932_cbdf2527-92e5-4e68-9a62-10a727990126.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251030092932_cbdf2527-92e5-4e68-9a62-10a727990126.sql
-- ----------------------------------------------------------------
-- Create board_papers table for storing created board papers
CREATE TABLE public.board_papers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  board_id UUID REFERENCES public.boards(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  period_covered TEXT NOT NULL,
  template_id UUID REFERENCES public.board_paper_templates(id) ON DELETE SET NULL,
  content JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.board_papers ENABLE ROW LEVEL SECURITY;

-- Users can view board papers in their org
ALTER TABLE public.board_papers DROP POLICY IF EXISTS "Users can view board papers in their org";
CREATE POLICY "Users can view board papers in their org"
ON public.board_papers
FOR SELECT
USING (
  org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  )
);

-- Users can create board papers
ALTER TABLE public.board_papers DROP POLICY IF EXISTS "Users can create board papers";
CREATE POLICY "Users can create board papers"
ON public.board_papers
FOR INSERT
WITH CHECK (
  created_by = auth.uid() AND
  org_id IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  )
);

-- Users can update their own board papers
ALTER TABLE public.board_papers DROP POLICY IF EXISTS "Users can update their own board papers";
CREATE POLICY "Users can update their own board papers"
ON public.board_papers
FOR UPDATE
USING (created_by = auth.uid());

-- Admins can update any board papers in their org
ALTER TABLE public.board_papers DROP POLICY IF EXISTS "Admins can update board papers in their org";
CREATE POLICY "Admins can update board papers in their org"
ON public.board_papers
FOR UPDATE
USING (
  has_role(auth.uid(), 'org_admin'::app_role) OR 
  has_role(auth.uid(), 'chair'::app_role)
);

-- Users can delete their own board papers
ALTER TABLE public.board_papers DROP POLICY IF EXISTS "Users can delete their own board papers";
CREATE POLICY "Users can delete their own board papers"
ON public.board_papers
FOR DELETE
USING (created_by = auth.uid());

-- DROP TRIGGER IF EXISTS for ON public.board_papers;
Create trigger for automatic timestamp updates
CREATE TRIGGER update_board_papers_updated_at
BEFORE UPDATE ON public.board_papers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_board_papers_org_id ON public.board_papers(org_id);
CREATE INDEX idx_board_papers_created_by ON public.board_papers(created_by);
CREATE INDEX idx_board_papers_status ON public.board_papers(status);

-- ----------------------------------------------------------------
-- Migration file: 20251030094241_982d8fb8-2f50-4992-b21b-30ec7e848528.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251030094241_982d8fb8-2f50-4992-b21b-30ec7e848528.sql
-- ----------------------------------------------------------------
-- Add period_end_date column to board_papers
ALTER TABLE public.board_papers 
ADD COLUMN period_end_date date;

-- ----------------------------------------------------------------
-- Migration file: 20251030095705_fcfd9b30-f151-42ae-b264-1fd7239bb7e3.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251030095705_fcfd9b30-f151-42ae-b264-1fd7239bb7e3.sql
-- ----------------------------------------------------------------
-- Drop existing INSERT policy for boards
DROP POLICY IF EXISTS "Org members can create boards" ON public.boards;

-- Create new INSERT policy with direct check
ALTER TABLE public.boards DROP POLICY IF EXISTS "Org members can create boards";
CREATE POLICY "Org members can create boards" 
ON public.boards 
FOR INSERT 
WITH CHECK (
  org_id IN (
    SELECT org_id 
    FROM public.profiles 
    WHERE id = auth.uid() 
    AND org_id IS NOT NULL
  )
);

-- ----------------------------------------------------------------
-- Migration file: 20251030095926_7716342a-74db-4a01-9532-c6ccbfbce42c.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251030095926_7716342a-74db-4a01-9532-c6ccbfbce42c.sql
-- ----------------------------------------------------------------
-- Drop the existing policy
DROP POLICY IF EXISTS "Org members can create boards" ON public.boards;

-- Recreate for authenticated users specifically
ALTER TABLE public.boards DROP POLICY IF EXISTS "Org members can create boards";
CREATE POLICY "Org members can create boards" 
ON public.boards 
FOR INSERT 
TO authenticated
WITH CHECK (
  org_id IN (
    SELECT org_id 
    FROM public.profiles 
    WHERE id = auth.uid() 
    AND org_id IS NOT NULL
  )
);

-- ----------------------------------------------------------------
-- Migration file: 20251030100022_f7b551f7-3cb7-42b3-8721-2726eb2185f0.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251030100022_f7b551f7-3cb7-42b3-8721-2726eb2185f0.sql
-- ----------------------------------------------------------------
-- Create a security definer function to check org membership
CREATE OR REPLACE FUNCTION public.user_can_create_in_org(check_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND org_id = check_org_id
    AND org_id IS NOT NULL
  );
$$;

-- Drop and recreate the INSERT policy using the function
DROP POLICY IF EXISTS "Org members can create boards" ON public.boards;

ALTER TABLE public.boards DROP POLICY IF EXISTS "Org members can create boards";
CREATE POLICY "Org members can create boards" 
ON public.boards 
FOR INSERT 
TO authenticated
WITH CHECK (
  public.user_can_create_in_org(org_id)
);

-- ----------------------------------------------------------------
-- Migration file: 20251030100800_a8f373b2-faac-4deb-ada8-d58d9eb3b109.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251030100800_a8f373b2-faac-4deb-ada8-d58d9eb3b109.sql
-- ----------------------------------------------------------------
-- Drop the problematic INSERT policy
DROP POLICY IF EXISTS "Org members can create boards" ON public.boards;

-- Create a simpler INSERT policy for authenticated users
-- The SELECT policy will handle data isolation
ALTER TABLE public.boards DROP POLICY IF EXISTS "Authenticated users can create boards";
CREATE POLICY "Authenticated users can create boards" 
ON public.boards 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- ----------------------------------------------------------------
-- Migration file: 20251030101141_a227042d-d8f0-44bf-8a7a-07562ecb40c1.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251030101141_a227042d-d8f0-44bf-8a7a-07562ecb40c1.sql
-- ----------------------------------------------------------------
-- Drop current INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create boards" ON public.boards;

-- Create INSERT policy matching the pattern of other policies (INSERT only uses WITH CHECK)
ALTER TABLE public.boards DROP POLICY IF EXISTS "Authenticated users can create boards";
CREATE POLICY "Authenticated users can create boards" 
ON public.boards 
FOR INSERT 
TO public
WITH CHECK (auth.uid() IS NOT NULL);

-- ----------------------------------------------------------------
-- Migration file: 20251030101422_60b81864-92e2-4179-a685-0a0cf2ba1820.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251030101422_60b81864-92e2-4179-a685-0a0cf2ba1820.sql
-- ----------------------------------------------------------------
-- Update the SELECT policy to allow users to view all boards in their org
DROP POLICY IF EXISTS "Users can view boards they are members of" ON public.boards;

ALTER TABLE public.boards DROP POLICY IF EXISTS "Users can view boards in their org";
CREATE POLICY "Users can view boards in their org" 
ON public.boards 
FOR SELECT 
TO public
USING (
  org_id IN (
    SELECT org_id 
    FROM public.profiles 
    WHERE id = auth.uid() 
    AND org_id IS NOT NULL
  )
);

-- ----------------------------------------------------------------
-- Migration file: 20251030101450_b0ce2893-6105-40dd-9fe6-f176854339ad.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251030101450_b0ce2893-6105-40dd-9fe6-f176854339ad.sql
-- ----------------------------------------------------------------
-- Rename Main Board to Aigentia Ltd Main Board
UPDATE public.boards
SET title = 'Aigentia Ltd Main Board'
WHERE id = 'bf3c4361-7b53-45e1-a76d-1f4fd413bdda';

-- ----------------------------------------------------------------
-- Migration file: 20251030101804_2234acb1-9532-49ad-88d4-6663f793a4eb.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251030101804_2234acb1-9532-49ad-88d4-6663f793a4eb.sql
-- ----------------------------------------------------------------
-- Delete test committee that was created during testing
DELETE FROM public.boards
WHERE title = 'Test Committee' 
AND org_id = '84828535-5f96-45b7-b782-2415199e6cad';

-- ----------------------------------------------------------------
-- Migration file: 20251030102641_024d2441-2a0c-4cd6-8b45-b0ee49e44d6a.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251030102641_024d2441-2a0c-4cd6-8b45-b0ee49e44d6a.sql
-- ----------------------------------------------------------------
-- Create committee_memberships table to link board members to committees
CREATE TABLE public.committee_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  committee_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.board_members(id) ON DELETE CASCADE,
  committee_role TEXT NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(committee_id, member_id)
);

-- Enable RLS
ALTER TABLE public.committee_memberships ENABLE ROW LEVEL SECURITY;

-- Users can view committee memberships in their org
ALTER TABLE public.committee_memberships DROP POLICY IF EXISTS "Users can view committee memberships in their org";
CREATE POLICY "Users can view committee memberships in their org"
ON public.committee_memberships
FOR SELECT
USING (
  committee_id IN (
    SELECT id FROM public.boards
    WHERE org_id IN (
      SELECT org_id FROM public.profiles
      WHERE id = auth.uid()
    )
  )
);

-- Users can manage committee memberships in their org
ALTER TABLE public.committee_memberships DROP POLICY IF EXISTS "Users can manage committee memberships";
CREATE POLICY "Users can manage committee memberships"
ON public.committee_memberships
FOR ALL
USING (
  committee_id IN (
    SELECT id FROM public.boards
    WHERE org_id IN (
      SELECT org_id FROM public.profiles
      WHERE id = auth.uid()
    )
  )
);

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_committee_memberships_updated_at ON public.committee_memberships;
CREATE TRIGGER update_committee_memberships_updated_at
BEFORE UPDATE ON public.committee_memberships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------
-- Migration file: 20251030115337_16dd1617-3654-41bd-824d-aab2a0dbf5d0.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251030115337_16dd1617-3654-41bd-824d-aab2a0dbf5d0.sql
-- ----------------------------------------------------------------
-- Fix audit logging functions to add org validation
-- This ensures users can only create audit entries for their own organization

CREATE OR REPLACE FUNCTION public.log_audit_entry(
  _entity_type text,
  _entity_id uuid,
  _action text,
  _detail_json jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_org_id UUID;
  _entity_org_id UUID;
BEGIN
  -- Get user's org
  SELECT org_id INTO _user_org_id
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Get entity's org based on entity_type
  IF _entity_type = 'board_member' THEN
    SELECT b.org_id INTO _entity_org_id
    FROM public.board_members bm
    JOIN public.boards b ON b.id = bm.board_id
    WHERE bm.id = _entity_id;
  ELSIF _entity_type = 'board' THEN
    SELECT org_id INTO _entity_org_id
    FROM public.boards
    WHERE id = _entity_id;
  ELSIF _entity_type = 'document_submission' THEN
    SELECT b.org_id INTO _entity_org_id
    FROM public.document_submissions ds
    JOIN public.boards b ON b.id = ds.board_id
    WHERE ds.id = _entity_id;
  ELSIF _entity_type = 'organization' THEN
    _entity_org_id := _entity_id;
  END IF;
  
  -- Only insert if user belongs to the same org or if entity_org_id is null (system actions)
  IF _user_org_id = _entity_org_id OR _entity_org_id IS NULL THEN
    INSERT INTO public.audit_log (
      entity_type,
      entity_id,
      actor_id,
      action,
      detail_json,
      timestamp
    ) VALUES (
      _entity_type,
      _entity_id,
      auth.uid(),
      _action,
      _detail_json,
      now()
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_board_member_audit(
  _member_id uuid,
  _field_name text,
  _change_type text,
  _old_value text DEFAULT NULL::text,
  _new_value text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_org_id UUID;
  _member_org_id UUID;
BEGIN
  -- Get user's org
  SELECT org_id INTO _user_org_id
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Get member's org
  SELECT b.org_id INTO _member_org_id
  FROM public.board_members bm
  JOIN public.boards b ON b.id = bm.board_id
  WHERE bm.id = _member_id;
  
  -- Only insert if user belongs to the same org
  IF _user_org_id = _member_org_id THEN
    INSERT INTO public.board_member_audit (
      member_id,
      changed_by,
      field_name,
      change_type,
      old_value,
      new_value,
      timestamp
    ) VALUES (
      _member_id,
      auth.uid(),
      _field_name,
      _change_type,
      _old_value,
      _new_value,
      now()
    );
  END IF;
END;
$$;

-- ----------------------------------------------------------------
-- Migration file: 20251101014650_9595fe90-5c69-40b3-ae5f-3ca5aae8f332.sql
-- Source path: C:\Users\david\Documents\board-spark-ai\supabase\migrations\20251101014650_9595fe90-5c69-40b3-ae5f-3ca5aae8f332.sql
-- ----------------------------------------------------------------
-- Fix RLS policies for board_members table
-- Allow board members with appropriate access to insert new members

-- Drop the existing "Admins can manage board members" policy if it exists
-- and recreate with better granularity

-- First, drop the old "Admins can manage board members" policy
DROP POLICY IF EXISTS "Admins can manage board members" ON public.board_members;

-- Create separate policies for INSERT, UPDATE, and DELETE with proper checks

-- INSERT: Allow org_admins, chairs, and board members to add new members to their boards
ALTER TABLE public.board_members DROP POLICY IF EXISTS "Board members can insert members in their boards";
CREATE POLICY "Board members can insert members in their boards"
  ON public.board_members FOR INSERT
  WITH CHECK (
    -- User must be a member of the board they're adding to
    board_id IN (
      SELECT board_id FROM public.board_memberships 
      WHERE user_id = auth.uid()
    )
    OR
    -- OR user is an admin/chair
    has_role(auth.uid(), 'org_admin'::app_role) OR 
    has_role(auth.uid(), 'chair'::app_role)
  );

-- UPDATE: Admins and chairs can update any member, or members can update their own profile
ALTER TABLE public.board_members DROP POLICY IF EXISTS "Admins and chairs can update board members";
CREATE POLICY "Admins and chairs can update board members"
  ON public.board_members FOR UPDATE
  USING (
    has_role(auth.uid(), 'org_admin'::app_role) OR 
    has_role(auth.uid(), 'chair'::app_role) OR
    user_id = auth.uid()
  )
  WITH CHECK (
    has_role(auth.uid(), 'org_admin'::app_role) OR 
    has_role(auth.uid(), 'chair'::app_role) OR
    user_id = auth.uid()
  );

-- DELETE: Only admins and chairs can delete members
ALTER TABLE public.board_members DROP POLICY IF EXISTS "Admins and chairs can delete board members";
CREATE POLICY "Admins and chairs can delete board members"
  ON public.board_members FOR DELETE
  USING (
    has_role(auth.uid(), 'org_admin'::app_role) OR 
    has_role(auth.uid(), 'chair'::app_role)
  );

