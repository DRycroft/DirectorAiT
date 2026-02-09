-- Remove overly permissive audit_log INSERT policy
-- All audit log inserts go through SECURITY DEFINER functions (log_audit_entry, 
-- log_board_member_audit, log_submission_review) which bypass RLS,
-- or through edge functions using the service role.
-- The "Authenticated users can insert audit logs" policy is unnecessary 
-- and allows potential audit log forgery.

DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_log;