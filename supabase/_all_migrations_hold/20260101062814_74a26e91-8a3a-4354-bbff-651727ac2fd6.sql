-- Add validation constraints to board_members table
-- Using validation triggers instead of CHECK constraints for flexibility

-- Create validation function for board_members
CREATE OR REPLACE FUNCTION public.validate_board_member_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Create trigger for insert and update
DROP TRIGGER IF EXISTS validate_board_member_trigger ON public.board_members;
CREATE TRIGGER validate_board_member_trigger
  BEFORE INSERT OR UPDATE ON public.board_members
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_board_member_data();

-- Add similar validation for organizations table
CREATE OR REPLACE FUNCTION public.validate_organization_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Create trigger for organizations
DROP TRIGGER IF EXISTS validate_organization_trigger ON public.organizations;
CREATE TRIGGER validate_organization_trigger
  BEFORE INSERT OR UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_organization_data();

-- Add validation for profiles table
CREATE OR REPLACE FUNCTION public.validate_profile_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Create trigger for profiles
DROP TRIGGER IF EXISTS validate_profile_trigger ON public.profiles;
CREATE TRIGGER validate_profile_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile_data();