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