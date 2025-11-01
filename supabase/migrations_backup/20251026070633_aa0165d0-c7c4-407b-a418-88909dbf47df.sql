-- Fix 1: Remove privilege escalation vulnerability in user_roles
-- Drop the dangerous "System can insert roles" policy
DROP POLICY IF EXISTS "System can insert roles" ON public.user_roles;

-- Create secure policy: Only org_admin and super_admin can assign roles
CREATE POLICY "Only admins can assign roles" 
ON public.user_roles
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'org_admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Create secure policy: Only admins can modify roles
CREATE POLICY "Only admins can modify roles" 
ON public.user_roles
FOR UPDATE 
USING (
  has_role(auth.uid(), 'org_admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Create secure policy: Only admins can delete roles
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

CREATE POLICY "Authenticated users can create snapshots"
ON public.document_snapshots
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);