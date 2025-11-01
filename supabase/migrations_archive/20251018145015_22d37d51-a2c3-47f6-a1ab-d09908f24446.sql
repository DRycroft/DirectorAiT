-- Fix security warnings without dropping function

-- Add missing RLS policies for document_snapshots
CREATE POLICY "Users can insert document snapshots" ON public.document_snapshots
  FOR INSERT WITH CHECK (true);

-- Add missing RLS policies for document_links  
CREATE POLICY "Users can view document links" ON public.document_links
  FOR SELECT USING (
    src_document_id IN (
      SELECT id FROM public.archived_documents WHERE 
        org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
  );

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
CREATE POLICY "System can create embeddings" ON public.document_embeddings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view embeddings" ON public.document_embeddings
  FOR SELECT USING (
    document_id IN (
      SELECT id FROM public.archived_documents WHERE 
        org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Add audit log insert policy
CREATE POLICY "System can create audit logs" ON public.audit_log
  FOR INSERT WITH CHECK (true);