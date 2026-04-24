CREATE OR REPLACE FUNCTION public.validate_board_member_data()
 RETURNS trigger
 LANGUAGE plpgsql
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

  -- Validate invite_email (this lives on board_members): if provided, valid format and <= 255 chars
  IF NEW.invite_email IS NOT NULL AND NEW.invite_email != '' THEN
    IF length(NEW.invite_email) > 255 THEN
      RAISE EXCEPTION 'Email must be less than 255 characters';
    END IF;
    IF NEW.invite_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid email format';
    END IF;
    NEW.invite_email := lower(trim(NEW.invite_email));
  END IF;

  -- Validate position: if provided, must be <= 100 chars
  IF NEW.position IS NOT NULL AND length(NEW.position) > 100 THEN
    RAISE EXCEPTION 'Position must be less than 100 characters';
  END IF;

  -- Validate preferred_title: if provided, must be <= 50 chars
  IF NEW.preferred_title IS NOT NULL AND length(NEW.preferred_title) > 50 THEN
    RAISE EXCEPTION 'Preferred title must be less than 50 characters';
  END IF;

  -- Validate short_bio: if provided, must be <= 500 chars
  IF NEW.short_bio IS NOT NULL AND length(NEW.short_bio) > 500 THEN
    RAISE EXCEPTION 'Bio must be less than 500 characters';
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