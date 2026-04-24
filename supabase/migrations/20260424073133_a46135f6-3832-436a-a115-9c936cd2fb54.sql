
-- Security Batch B: Split sensitive organization fields into 1:1 sibling table

-- 1) Create sibling table
CREATE TABLE IF NOT EXISTS public.organization_sensitive (
  org_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  business_number text,
  company_phone text,
  primary_contact_name text,
  primary_contact_role text,
  primary_contact_email text,
  primary_contact_phone text,
  admin_name text,
  admin_role text,
  admin_email text,
  admin_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Backfill from existing organizations rows
INSERT INTO public.organization_sensitive (
  org_id, business_number, company_phone,
  primary_contact_name, primary_contact_role, primary_contact_email, primary_contact_phone,
  admin_name, admin_role, admin_email, admin_phone
)
SELECT
  id, business_number, company_phone,
  primary_contact_name, primary_contact_role, primary_contact_email, primary_contact_phone,
  admin_name, admin_role, admin_email, admin_phone
FROM public.organizations
ON CONFLICT (org_id) DO NOTHING;

-- 3) Enable RLS and add admin/chair-only policies
ALTER TABLE public.organization_sensitive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and chairs can view org sensitive data"
ON public.organization_sensitive
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'org_admin'::public.app_role, org_id)
  OR public.has_role(auth.uid(), 'chair'::public.app_role, org_id)
);

CREATE POLICY "Admins and chairs can insert org sensitive data"
ON public.organization_sensitive
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'org_admin'::public.app_role, org_id)
  OR public.has_role(auth.uid(), 'chair'::public.app_role, org_id)
);

CREATE POLICY "Admins and chairs can update org sensitive data"
ON public.organization_sensitive
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'org_admin'::public.app_role, org_id)
  OR public.has_role(auth.uid(), 'chair'::public.app_role, org_id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'org_admin'::public.app_role, org_id)
  OR public.has_role(auth.uid(), 'chair'::public.app_role, org_id)
);

CREATE TRIGGER update_organization_sensitive_updated_at
BEFORE UPDATE ON public.organization_sensitive
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Update bootstrap_user_workspace
CREATE OR REPLACE FUNCTION public.bootstrap_user_workspace(_company_name text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id    uuid := auth.uid();
  v_email      text;
  v_name       text;
  v_phone      text;
  v_org_name   text;
  v_org_id     uuid;
  v_board_id   uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT org_id INTO v_org_id FROM public.profiles WHERE id = v_user_id;
  IF v_org_id IS NOT NULL THEN
    RETURN v_org_id;
  END IF;

  IF EXISTS (SELECT 1 FROM public.board_memberships WHERE user_id = v_user_id) THEN
    RAISE EXCEPTION 'already_has_memberships' USING ERRCODE = '42501';
  END IF;

  SELECT
    u.email,
    COALESCE(NULLIF(u.raw_user_meta_data->>'name',''), split_part(u.email,'@',1), 'User'),
    NULLIF(u.raw_user_meta_data->>'phone','')
  INTO v_email, v_name, v_phone
  FROM auth.users u WHERE u.id = v_user_id;

  v_org_name := COALESCE(NULLIF(trim(_company_name),''), 'My Organization');

  INSERT INTO public.organizations (name)
  VALUES (v_org_name)
  RETURNING id INTO v_org_id;

  INSERT INTO public.organization_sensitive (
    org_id, primary_contact_name, primary_contact_email, primary_contact_phone
  )
  VALUES (v_org_id, v_name, v_email, v_phone);

  INSERT INTO public.boards (org_id, title, board_type, status)
  VALUES (v_org_id, 'Main Board', 'main', 'active')
  RETURNING id INTO v_board_id;

  INSERT INTO public.profiles (id, email, name, org_id, phone)
  VALUES (v_user_id, v_email, v_name, v_org_id, v_phone)
  ON CONFLICT (id) DO UPDATE
    SET org_id = EXCLUDED.org_id,
        name   = COALESCE(public.profiles.name, EXCLUDED.name),
        phone  = COALESCE(public.profiles.phone, EXCLUDED.phone);

  INSERT INTO public.board_memberships (board_id, user_id, role, accepted_at)
  VALUES (v_board_id, v_user_id, 'owner', now())
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_roles (user_id, role, org_id)
  VALUES (v_user_id, 'org_admin', v_org_id)
  ON CONFLICT DO NOTHING;

  RETURN v_org_id;
END;
$function$;

-- 5) Update validate_organization_data trigger
CREATE OR REPLACE FUNCTION public.validate_organization_data()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.name IS NULL OR length(trim(NEW.name)) < 2 THEN
    RAISE EXCEPTION 'Organization name must be at least 2 characters';
  END IF;
  IF length(NEW.name) > 200 THEN
    RAISE EXCEPTION 'Organization name must be less than 200 characters';
  END IF;
  NEW.name := trim(NEW.name);
  RETURN NEW;
END;
$function$;

-- 6) Validation trigger on organization_sensitive
CREATE OR REPLACE FUNCTION public.validate_organization_sensitive_data()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.primary_contact_email IS NOT NULL AND NEW.primary_contact_email != '' THEN
    IF length(NEW.primary_contact_email) > 255 THEN
      RAISE EXCEPTION 'Email must be less than 255 characters';
    END IF;
    IF NEW.primary_contact_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid email format';
    END IF;
    NEW.primary_contact_email := lower(trim(NEW.primary_contact_email));
  END IF;
  IF NEW.admin_email IS NOT NULL AND NEW.admin_email != '' THEN
    IF length(NEW.admin_email) > 255 THEN
      RAISE EXCEPTION 'Email must be less than 255 characters';
    END IF;
    IF NEW.admin_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
      RAISE EXCEPTION 'Invalid email format';
    END IF;
    NEW.admin_email := lower(trim(NEW.admin_email));
  END IF;
  IF NEW.primary_contact_name IS NOT NULL AND length(NEW.primary_contact_name) > 100 THEN
    RAISE EXCEPTION 'Contact name must be less than 100 characters';
  END IF;
  IF NEW.admin_name IS NOT NULL AND length(NEW.admin_name) > 100 THEN
    RAISE EXCEPTION 'Admin name must be less than 100 characters';
  END IF;
  IF NEW.primary_contact_name IS NOT NULL THEN
    NEW.primary_contact_name := trim(NEW.primary_contact_name);
  END IF;
  IF NEW.admin_name IS NOT NULL THEN
    NEW.admin_name := trim(NEW.admin_name);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER validate_organization_sensitive_before_write
BEFORE INSERT OR UPDATE ON public.organization_sensitive
FOR EACH ROW
EXECUTE FUNCTION public.validate_organization_sensitive_data();

-- 7) Drop old E.164 constraint on organizations (references columns being dropped)
ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS org_phone_e164_format;

-- 8) Add E.164 constraint on new sensitive table - NOT VALID to grandfather existing rows
ALTER TABLE public.organization_sensitive
  ADD CONSTRAINT org_sensitive_phone_e164_format
  CHECK (
    (company_phone IS NULL OR company_phone ~ '^\+[1-9]\d{1,14}$') AND
    (primary_contact_phone IS NULL OR primary_contact_phone ~ '^\+[1-9]\d{1,14}$') AND
    (admin_phone IS NULL OR admin_phone ~ '^\+[1-9]\d{1,14}$')
  ) NOT VALID;

-- 9) Drop the sensitive columns from organizations
ALTER TABLE public.organizations
  DROP COLUMN IF EXISTS business_number,
  DROP COLUMN IF EXISTS company_phone,
  DROP COLUMN IF EXISTS primary_contact_name,
  DROP COLUMN IF EXISTS primary_contact_role,
  DROP COLUMN IF EXISTS primary_contact_email,
  DROP COLUMN IF EXISTS primary_contact_phone,
  DROP COLUMN IF EXISTS admin_name,
  DROP COLUMN IF EXISTS admin_role,
  DROP COLUMN IF EXISTS admin_email,
  DROP COLUMN IF EXISTS admin_phone;
