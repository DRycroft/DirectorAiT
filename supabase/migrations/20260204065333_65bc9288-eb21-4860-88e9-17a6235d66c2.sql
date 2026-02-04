-- ================================================================
-- SECURITY DEFINER Functions Hardening
-- ================================================================

-- 1. Fix log_submission_review to verify org membership like other log functions
CREATE OR REPLACE FUNCTION public.log_submission_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _user_org_id UUID;
  _submission_org_id UUID;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get user's org
    SELECT org_id INTO _user_org_id
    FROM public.profiles
    WHERE id = auth.uid();
    
    -- Get submission's org via document -> board -> org chain
    SELECT b.org_id INTO _submission_org_id
    FROM public.document_submissions ds
    JOIN public.archived_documents ad ON ad.id = ds.document_id
    JOIN public.boards b ON b.id = ad.board_id
    WHERE ds.id = NEW.id;
    
    -- Only insert audit log if user belongs to the same org
    IF _user_org_id = _submission_org_id OR _submission_org_id IS NULL THEN
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
  END IF;
  RETURN NEW;
END;
$function$;

-- 2. Convert update_updated_at_column to SECURITY INVOKER (doesn't need elevated privileges)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 3. Convert pure calculation function to SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.calculate_next_due_date(last_date date, freq compliance_frequency)
RETURNS date
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
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
$function$;

-- 4. Convert trigger_compliance_scan to SECURITY INVOKER (only modifies the triggering row)
CREATE OR REPLACE FUNCTION public.trigger_compliance_scan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Mark that a scan is needed when industry or category changes
  IF (NEW.industry_sector IS DISTINCT FROM OLD.industry_sector) OR 
     (NEW.business_category IS DISTINCT FROM OLD.business_category) THEN
    NEW.compliance_scan_completed = false;
    NEW.compliance_scan_date = NULL;
  END IF;
  RETURN NEW;
END;
$function$;

-- 5. Convert validation triggers to SECURITY INVOKER (only validate/modify the triggering row)
CREATE OR REPLACE FUNCTION public.validate_board_member_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate full_name: required, 1-100 characters
  IF NEW.full_name IS NULL OR length(trim(NEW.full_name)) < 1 THEN
    RAISE EXCEPTION 'Full name is required';
  END IF;
  IF length(NEW.full_name) > 100 THEN
    RAISE EXCEPTION 'Full name must be less than 100 characters';
  END IF;
  
  -- Validate personal_email: if provided, must be valid format and <= 255 chars
  IF NEW.personal_email IS NOT NULL AND NEW.personal_email != '' THEN
    IF length(NEW.personal_email) > 255 THEN
      RAISE EXCEPTION 'Email must be less than 255 characters';
    END IF;
    IF NEW.personal_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid email format';
    END IF;
  END IF;
  
  -- Validate position: if provided, must be <= 100 chars
  IF NEW.position IS NOT NULL AND length(NEW.position) > 100 THEN
    RAISE EXCEPTION 'Position must be less than 100 characters';
  END IF;
  
  -- Validate preferred_title: if provided, must be <= 50 chars
  IF NEW.preferred_title IS NOT NULL AND length(NEW.preferred_title) > 50 THEN
    RAISE EXCEPTION 'Preferred title must be less than 50 characters';
  END IF;
  
  -- Validate personal_mobile: if provided, must be <= 20 chars (international format)
  IF NEW.personal_mobile IS NOT NULL AND length(NEW.personal_mobile) > 20 THEN
    RAISE EXCEPTION 'Phone number must be less than 20 characters';
  END IF;
  
  -- Validate short_bio: if provided, must be <= 500 chars
  IF NEW.short_bio IS NOT NULL AND length(NEW.short_bio) > 500 THEN
    RAISE EXCEPTION 'Bio must be less than 500 characters';
  END IF;
  
  -- Normalize email to lowercase and trim
  IF NEW.personal_email IS NOT NULL THEN
    NEW.personal_email := lower(trim(NEW.personal_email));
  END IF;
  
  -- Trim whitespace from text fields
  NEW.full_name := trim(NEW.full_name);
  IF NEW.position IS NOT NULL THEN
    NEW.position := trim(NEW.position);
  END IF;
  IF NEW.preferred_title IS NOT NULL THEN
    NEW.preferred_title := trim(NEW.preferred_title);
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_organization_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate name: required, 2-200 characters
  IF NEW.name IS NULL OR length(trim(NEW.name)) < 2 THEN
    RAISE EXCEPTION 'Organization name must be at least 2 characters';
  END IF;
  IF length(NEW.name) > 200 THEN
    RAISE EXCEPTION 'Organization name must be less than 200 characters';
  END IF;
  
  -- Validate primary_contact_email: if provided, must be valid format
  IF NEW.primary_contact_email IS NOT NULL AND NEW.primary_contact_email != '' THEN
    IF length(NEW.primary_contact_email) > 255 THEN
      RAISE EXCEPTION 'Email must be less than 255 characters';
    END IF;
    IF NEW.primary_contact_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid email format';
    END IF;
    NEW.primary_contact_email := lower(trim(NEW.primary_contact_email));
  END IF;
  
  -- Validate primary_contact_name: if provided, must be <= 100 chars
  IF NEW.primary_contact_name IS NOT NULL AND length(NEW.primary_contact_name) > 100 THEN
    RAISE EXCEPTION 'Contact name must be less than 100 characters';
  END IF;
  
  -- Trim whitespace
  NEW.name := trim(NEW.name);
  IF NEW.primary_contact_name IS NOT NULL THEN
    NEW.primary_contact_name := trim(NEW.primary_contact_name);
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_profile_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate name: required, 2-100 characters
  IF NEW.name IS NULL OR length(trim(NEW.name)) < 2 THEN
    RAISE EXCEPTION 'Name must be at least 2 characters';
  END IF;
  IF length(NEW.name) > 100 THEN
    RAISE EXCEPTION 'Name must be less than 100 characters';
  END IF;
  
  -- Validate email: required, valid format
  IF NEW.email IS NULL OR NEW.email = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;
  IF length(NEW.email) > 255 THEN
    RAISE EXCEPTION 'Email must be less than 255 characters';
  END IF;
  IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  -- Validate phone: if provided, must be <= 20 chars
  IF NEW.phone IS NOT NULL AND length(NEW.phone) > 20 THEN
    RAISE EXCEPTION 'Phone number must be less than 20 characters';
  END IF;
  
  -- Normalize
  NEW.email := lower(trim(NEW.email));
  NEW.name := trim(NEW.name);
  
  RETURN NEW;
END;
$function$;