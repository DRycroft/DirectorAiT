-- Add INSERT policy for audit_log table to allow authenticated users and SECURITY DEFINER functions to insert
-- This ensures audit events are properly captured even if direct inserts are attempted

CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_log
FOR INSERT
TO authenticated
WITH CHECK (actor_id = auth.uid() OR actor_id IS NULL);

-- Also allow service role to insert (for edge functions and SECURITY DEFINER functions)
CREATE POLICY "Service role can insert audit logs"
ON public.audit_log
FOR INSERT
TO service_role
WITH CHECK (true);