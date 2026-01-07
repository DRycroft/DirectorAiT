


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'super_admin',
    'org_admin',
    'chair',
    'director',
    'executive',
    'staff',
    'observer',
    'external_guest'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."compliance_frequency" AS ENUM (
    'daily',
    'weekly',
    'monthly',
    'quarterly',
    'semi_annual',
    'annual',
    'biennial',
    'as_required'
);


ALTER TYPE "public"."compliance_frequency" OWNER TO "postgres";


CREATE TYPE "public"."compliance_status" AS ENUM (
    'compliant',
    'due_soon',
    'overdue',
    'not_applicable',
    'in_progress'
);


ALTER TYPE "public"."compliance_status" OWNER TO "postgres";


CREATE TYPE "public"."draft_status" AS ENUM (
    'in_progress',
    'awaiting_review',
    'approved',
    'archived'
);


ALTER TYPE "public"."draft_status" OWNER TO "postgres";


CREATE TYPE "public"."template_scope" AS ENUM (
    'personal',
    'team',
    'organization'
);


ALTER TYPE "public"."template_scope" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_default_role"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."assign_default_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auth_check"("table_name" "text", "operation" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$  
BEGIN
  IF current_setting('role', true) = 'anon' THEN RETURN false; END IF;
  IF current_setting('role', true) != 'authenticated' THEN RETURN false; END IF;
  IF operation = 'INSERT' THEN
    RETURN (auth.uid() = NEW.user_id) OR EXISTS (SELECT 1 FROM org_admins WHERE user_id = auth.uid() AND org_id = NEW.org_id);
  END IF;
  RETURN false;
END;
  $$;


ALTER FUNCTION "public"."auth_check"("table_name" "text", "operation" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_next_due_date"("last_date" "date", "freq" "public"."compliance_frequency") RETURNS "date"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."calculate_next_due_date"("last_date" "date", "freq" "public"."compliance_frequency") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_default_staff_form_templates"("p_org_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."create_default_staff_form_templates"("p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_member_invite_token"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$;


ALTER FUNCTION "public"."generate_member_invite_token"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_org_id"("user_id" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT org_id FROM public.profiles WHERE id = user_id LIMIT 1;
$$;


ALTER FUNCTION "public"."get_user_org_id"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_board_member"("user_id" "uuid", "board_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.board_memberships 
    WHERE user_id = is_board_member.user_id 
    AND board_id = is_board_member.board_id
  );
$$;


ALTER FUNCTION "public"."is_board_member"("user_id" "uuid", "board_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_audit_entry"("_entity_type" "text", "_entity_id" "uuid", "_action" "text", "_detail_json" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."log_audit_entry"("_entity_type" "text", "_entity_id" "uuid", "_action" "text", "_detail_json" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_board_member_audit"("_member_id" "uuid", "_field_name" "text", "_change_type" "text", "_old_value" "text" DEFAULT NULL::"text", "_new_value" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."log_board_member_audit"("_member_id" "uuid", "_field_name" "text", "_change_type" "text", "_old_value" "text", "_new_value" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_submission_review"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."log_submission_review"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_compliance_scan"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."trigger_compliance_scan"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_can_create_in_org"("check_org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND org_id = check_org_id
    AND org_id IS NOT NULL
  );
$$;


ALTER FUNCTION "public"."user_can_create_in_org"("check_org_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."action_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agenda_item_id" "uuid",
    "extracted_decision_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "owner_id" "uuid",
    "due_date" "date",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "action_items_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'completed'::"text", 'blocked'::"text"])))
);


ALTER TABLE "public"."action_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agenda_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agenda_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "item_order" integer DEFAULT 0 NOT NULL,
    "required_reading" boolean DEFAULT false,
    "estimated_duration" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."agenda_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agendas" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "board_id" "uuid" NOT NULL,
    "meeting_date" timestamp with time zone NOT NULL,
    "title" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "agendas_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."agendas" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."approval_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "board_id" "uuid",
    "request_type" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "requested_by" "uuid" NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "first_approver" "uuid",
    "first_approved_at" timestamp with time zone,
    "second_approver" "uuid",
    "second_approved_at" timestamp with time zone,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "request_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "comments" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "different_approvers" CHECK ((("first_approver" IS NULL) OR ("second_approver" IS NULL) OR ("first_approver" <> "second_approver"))),
    CONSTRAINT "status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."approval_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."archived_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "board_id" "uuid",
    "file_name" "text" NOT NULL,
    "file_type" "text" NOT NULL,
    "uploaded_by" "uuid" NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "snapshot_id" "uuid" NOT NULL,
    "raw_text" "text",
    "parsed_metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "ocr_language" "text" DEFAULT 'en'::"text",
    "confidential_level" "text" DEFAULT 'standard'::"text",
    "approved" boolean DEFAULT false,
    "error_json" "jsonb",
    "processing_status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "archived_documents_confidential_level_check" CHECK (("confidential_level" = ANY (ARRAY['public'::"text", 'standard'::"text", 'confidential'::"text", 'restricted'::"text"]))),
    CONSTRAINT "archived_documents_processing_status_check" CHECK (("processing_status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."archived_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "actor_id" "uuid",
    "action" "text" NOT NULL,
    "detail_json" "jsonb" DEFAULT '{}'::"jsonb",
    "ip_address" "text",
    "user_agent" "text",
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."board_member_audit" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "member_id" "uuid" NOT NULL,
    "changed_by" "uuid",
    "field_name" "text" NOT NULL,
    "old_value" "text",
    "new_value" "text",
    "change_type" "text" NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "board_member_audit_change_type_check" CHECK (("change_type" = ANY (ARRAY['created'::"text", 'updated'::"text", 'published'::"text", 'unpublished'::"text"])))
);


ALTER TABLE "public"."board_member_audit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."board_member_coi" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "member_id" "uuid" NOT NULL,
    "declared_interest" "text" NOT NULL,
    "type" "text" NOT NULL,
    "related_party_name" "text",
    "date_declared" "date" DEFAULT CURRENT_DATE NOT NULL,
    "status" "text" DEFAULT 'active'::"text",
    "management_steps" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "board_member_coi_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'mitigated'::"text", 'resolved'::"text"]))),
    CONSTRAINT "board_member_coi_type_check" CHECK (("type" = ANY (ARRAY['financial'::"text", 'familial'::"text", 'contractual'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."board_member_coi" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."board_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "board_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "full_name" "text" NOT NULL,
    "preferred_title" "text",
    "public_job_title" "text",
    "short_bio" "text",
    "public_photo_url" "text",
    "public_company_affiliations" "text",
    "professional_qualifications" "text",
    "public_social_links" "jsonb" DEFAULT '{}'::"jsonb",
    "public_contact_email" "text",
    "legal_name" "text",
    "personal_mobile" "text",
    "personal_email" "text",
    "cv_file_url" "text",
    "detailed_work_history" "text",
    "appointment_date" "date",
    "term_expiry" "date",
    "reappointment_history" "jsonb" DEFAULT '[]'::"jsonb",
    "skills_competencies" "jsonb" DEFAULT '[]'::"jsonb",
    "emergency_contact_name" "text",
    "emergency_contact_phone" "text",
    "national_id" "text",
    "home_address" "text",
    "sensitive_notes" "text",
    "publish_preferences" "jsonb" DEFAULT '{}'::"jsonb",
    "consent_signed_at" timestamp with time zone,
    "consent_signature" "text",
    "status" "text" DEFAULT 'invited'::"text",
    "invite_token" "text",
    "invite_sent_at" timestamp with time zone,
    "profile_completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "member_type" "text" DEFAULT 'board'::"text",
    "position" "text",
    "date_of_birth" "date",
    "reports_to" "uuid",
    "reports_responsible_for" "jsonb" DEFAULT '[]'::"jsonb",
    "personal_interests" "text",
    "health_notes" "text",
    "custom_fields" "jsonb" DEFAULT '{}'::"jsonb",
    CONSTRAINT "board_members_member_type_check" CHECK (("member_type" = ANY (ARRAY['board'::"text", 'executive'::"text", 'key_staff'::"text"]))),
    CONSTRAINT "board_members_status_check" CHECK (("status" = ANY (ARRAY['invited'::"text", 'pending'::"text", 'active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."board_members" OWNER TO "postgres";


COMMENT ON COLUMN "public"."board_members"."member_type" IS 'Type of member: board, executive, or key_staff';



COMMENT ON COLUMN "public"."board_members"."position" IS 'Specific position: chair, deputy_chair, ceo, cfo, etc.';



COMMENT ON COLUMN "public"."board_members"."health_notes" IS 'Sensitive: Health information voluntarily shared by team member';



COMMENT ON COLUMN "public"."board_members"."custom_fields" IS 'Stores custom field data defined in staff form templates';



CREATE TABLE IF NOT EXISTS "public"."board_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "board_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "invited_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "accepted_at" timestamp with time zone,
    CONSTRAINT "board_memberships_role_check" CHECK (("role" = ANY (ARRAY['chair'::"text", 'director'::"text", 'observer'::"text"])))
);


ALTER TABLE "public"."board_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."board_paper_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "template_name" "text" NOT NULL,
    "template_type" "text" NOT NULL,
    "company_name" "text",
    "logo_url" "text",
    "sections" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "is_default" boolean DEFAULT false,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."board_paper_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."board_papers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "board_id" "uuid",
    "created_by" "uuid" NOT NULL,
    "company_name" "text" NOT NULL,
    "period_covered" "text" NOT NULL,
    "template_id" "uuid",
    "content" "jsonb" DEFAULT '{}'::"jsonb",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "period_end_date" "date"
);


ALTER TABLE "public"."board_papers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."board_role_overrides" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "board_id" "uuid" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "role_id" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."board_role_overrides" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."board_settings" (
    "board_id" "uuid" NOT NULL,
    "quorum_percent" integer DEFAULT 50,
    "vote_threshold" integer DEFAULT 50,
    "supermajority_threshold" integer DEFAULT 66,
    "silent_vote_window" integer DEFAULT 48,
    "reveal_policy" "text" DEFAULT 'chair_controlled'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "board_settings_quorum_percent_check" CHECK ((("quorum_percent" > 0) AND ("quorum_percent" <= 100))),
    CONSTRAINT "board_settings_reveal_policy_check" CHECK (("reveal_policy" = ANY (ARRAY['chair_controlled'::"text", 'immediate'::"text", 'after_quorum'::"text"]))),
    CONSTRAINT "board_settings_silent_vote_window_check" CHECK (("silent_vote_window" > 0)),
    CONSTRAINT "board_settings_supermajority_threshold_check" CHECK ((("supermajority_threshold" > 0) AND ("supermajority_threshold" <= 100))),
    CONSTRAINT "board_settings_vote_threshold_check" CHECK ((("vote_threshold" > 0) AND ("vote_threshold" <= 100)))
);


ALTER TABLE "public"."board_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."boards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "timezone" "text" DEFAULT 'UTC'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "board_type" "text" DEFAULT 'main'::"text",
    "parent_board_id" "uuid",
    "status" "text" DEFAULT 'active'::"text",
    "archived_at" timestamp with time zone,
    "committee_purpose" "text",
    CONSTRAINT "boards_board_type_check" CHECK (("board_type" = ANY (ARRAY['main'::"text", 'sub_committee'::"text", 'special_purpose'::"text"]))),
    CONSTRAINT "boards_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."boards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."committee_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "committee_id" "uuid" NOT NULL,
    "member_id" "uuid" NOT NULL,
    "committee_role" "text" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."committee_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."compliance_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."compliance_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."compliance_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "board_id" "uuid",
    "category_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "authority" "text",
    "frequency" "public"."compliance_frequency" DEFAULT 'annual'::"public"."compliance_frequency" NOT NULL,
    "next_due_date" "date",
    "last_completed_date" "date",
    "responsible_person" "text",
    "status" "public"."compliance_status" DEFAULT 'compliant'::"public"."compliance_status" NOT NULL,
    "industry_sector" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "reminder_days_before" integer DEFAULT 30,
    "notes" "text",
    "reference_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."compliance_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."compliance_reviews" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "compliance_item_id" "uuid" NOT NULL,
    "reviewed_by" "uuid" NOT NULL,
    "review_date" "date" NOT NULL,
    "status" "public"."compliance_status" NOT NULL,
    "notes" "text",
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    "signed_off_by" "uuid",
    "signed_off_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."compliance_reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."compliance_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "industry_sector" "text" NOT NULL,
    "category_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "authority" "text",
    "frequency" "public"."compliance_frequency" NOT NULL,
    "is_mandatory" boolean DEFAULT true NOT NULL,
    "reference_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."compliance_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dashboard_metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "metric_name" "text" NOT NULL,
    "metric_value" numeric,
    "metric_unit" "text",
    "period_type" "text" DEFAULT 'current'::"text" NOT NULL,
    "period_start" "date",
    "period_end" "date",
    "data_source" "text" NOT NULL,
    "last_synced_at" timestamp with time zone DEFAULT "now"(),
    "metadata_json" "jsonb" DEFAULT '{}'::"jsonb",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "dashboard_metrics_category_check" CHECK (("category" = ANY (ARRAY['financial'::"text", 'health_safety'::"text", 'hr'::"text", 'sales'::"text", 'projects'::"text", 'compliance'::"text", 'governance'::"text"]))),
    CONSTRAINT "dashboard_metrics_period_type_check" CHECK (("period_type" = ANY (ARRAY['current'::"text", 'mtd'::"text", 'qtd'::"text", 'ytd'::"text", 'custom'::"text"])))
);


ALTER TABLE "public"."dashboard_metrics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dashboard_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "layout_json" "jsonb" DEFAULT '{"grid": {"columns": 12, "rowHeight": 100}, "widgets": []}'::"jsonb" NOT NULL,
    "is_default" boolean DEFAULT false,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."dashboard_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."dashboard_widgets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "widget_type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "config_json" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "position_x" integer DEFAULT 0 NOT NULL,
    "position_y" integer DEFAULT 0 NOT NULL,
    "width" integer DEFAULT 4 NOT NULL,
    "height" integer DEFAULT 2 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "dashboard_widgets_widget_type_check" CHECK (("widget_type" = ANY (ARRAY['kpi'::"text", 'kpi_card'::"text", 'line'::"text", 'line_chart'::"text", 'bar'::"text", 'bar_chart'::"text", 'pie'::"text", 'pie_chart'::"text", 'table'::"text", 'traffic-light'::"text", 'traffic_light'::"text", 'gauge'::"text"])))
);


ALTER TABLE "public"."dashboard_widgets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."document_drafts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "template_id" "uuid",
    "section_key" "text" NOT NULL,
    "content" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "status" "public"."draft_status" DEFAULT 'in_progress'::"public"."draft_status",
    "created_by" "uuid" NOT NULL,
    "org_id" "uuid",
    "board_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_saved" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."document_drafts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."document_embeddings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_id" "uuid" NOT NULL,
    "chunk_index" integer NOT NULL,
    "chunk_text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."document_embeddings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."document_links" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "src_document_id" "uuid" NOT NULL,
    "linked_item_type" "text" NOT NULL,
    "linked_item_id" "uuid" NOT NULL,
    "similarity_score" numeric(3,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "document_links_linked_item_type_check" CHECK (("linked_item_type" = ANY (ARRAY['agenda_item'::"text", 'decision'::"text", 'document'::"text"]))),
    CONSTRAINT "document_links_similarity_score_check" CHECK ((("similarity_score" >= (0)::numeric) AND ("similarity_score" <= (1)::numeric)))
);


ALTER TABLE "public"."document_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."document_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "storage_path" "text" NOT NULL,
    "checksum_sha256" "text" NOT NULL,
    "filesize" bigint NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "encryption_key_id" "text"
);


ALTER TABLE "public"."document_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."document_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_id" "uuid" NOT NULL,
    "submitted_by" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "comments" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    CONSTRAINT "document_submissions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."document_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."executive_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "report_type" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "uploaded_by" "uuid" NOT NULL,
    "uploaded_by_name" "text" NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "period_covered" "text" NOT NULL,
    "board_id" "uuid",
    "org_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."executive_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."extracted_decisions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_id" "uuid" NOT NULL,
    "decision_text" "text" NOT NULL,
    "decision_date" "date",
    "motion_text" "text",
    "proposer" "text",
    "outcome" "text",
    "vote_count" "jsonb",
    "owners" "jsonb",
    "due_date" "date",
    "confidence_score" numeric(3,2),
    "source_page" integer,
    "source_snippet" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "extracted_decisions_confidence_score_check" CHECK ((("confidence_score" >= (0)::numeric) AND ("confidence_score" <= (1)::numeric))),
    CONSTRAINT "extracted_decisions_outcome_check" CHECK (("outcome" = ANY (ARRAY['passed'::"text", 'rejected'::"text", 'deferred'::"text", 'unknown'::"text"])))
);


ALTER TABLE "public"."extracted_decisions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ingest_jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'queued'::"text" NOT NULL,
    "total_files" integer DEFAULT 0 NOT NULL,
    "completed_files" integer DEFAULT 0 NOT NULL,
    "failed_files" integer DEFAULT 0 NOT NULL,
    "started_at" timestamp with time zone,
    "finished_at" timestamp with time zone,
    "log_json" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "ingest_jobs_status_check" CHECK (("status" = ANY (ARRAY['queued'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text", 'partially_completed'::"text"])))
);


ALTER TABLE "public"."ingest_jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meeting_minutes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "meeting_date" "date" NOT NULL,
    "meeting_type" "text" DEFAULT 'Regular Board Meeting'::"text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "uploaded_by" "uuid" NOT NULL,
    "uploaded_by_name" "text" NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "board_id" "uuid",
    "org_id" "uuid" NOT NULL,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."meeting_minutes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."org_admins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "admin_type" "text" NOT NULL,
    "appointed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "appointed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "org_admins_admin_type_check" CHECK (("admin_type" = ANY (ARRAY['primary'::"text", 'secondary'::"text"])))
);


ALTER TABLE "public"."org_admins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "domain" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "logo_url" "text",
    "business_number" "text",
    "primary_contact_name" "text",
    "primary_contact_role" "text",
    "primary_contact_email" "text",
    "primary_contact_phone" "text",
    "admin_name" "text",
    "admin_role" "text",
    "admin_email" "text",
    "admin_phone" "text",
    "reporting_frequency" "text",
    "financial_year_end" "date",
    "agm_date" "date",
    "company_phone" "text",
    "gst_period" "text",
    "industry_sector" "text"[],
    "business_category" "text"[],
    "compliance_scan_completed" boolean DEFAULT false,
    "compliance_scan_date" timestamp with time zone,
    CONSTRAINT "org_phone_e164_format" CHECK (((("company_phone" IS NULL) OR ("company_phone" ~ '^\+[1-9]\d{1,14}$'::"text")) AND (("primary_contact_phone" IS NULL) OR ("primary_contact_phone" ~ '^\+[1-9]\d{1,14}$'::"text")) AND (("admin_phone" IS NULL) OR ("admin_phone" ~ '^\+[1-9]\d{1,14}$'::"text")))),
    CONSTRAINT "organizations_reporting_frequency_check" CHECK (("reporting_frequency" = ANY (ARRAY['monthly'::"text", 'bi-monthly'::"text", 'quarterly'::"text", 'biannually'::"text"])))
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."organizations"."industry_sector" IS 'Multiple industry sectors the business operates in';



COMMENT ON COLUMN "public"."organizations"."business_category" IS 'Multiple business categories for government classification';



COMMENT ON CONSTRAINT "org_phone_e164_format" ON "public"."organizations" IS 'Ensures all organization phone numbers follow E.164 international format';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "org_id" "uuid",
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "mfa_enforced" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "phone" "text",
    CONSTRAINT "profiles_phone_e164_format" CHECK ((("phone" IS NULL) OR ("phone" ~ '^\+[1-9]\d{1,14}$'::"text")))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON CONSTRAINT "profiles_phone_e164_format" ON "public"."profiles" IS 'Ensures phone numbers follow E.164 international format: +[country code][number], max 15 digits';



CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."special_papers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "category" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "uploaded_by" "uuid" NOT NULL,
    "uploaded_by_name" "text" NOT NULL,
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deadline" "date",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "board_id" "uuid",
    "org_id" "uuid" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."special_papers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_form_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "form_type" "text" NOT NULL,
    "fields" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "staff_form_templates_form_type_check" CHECK (("form_type" = ANY (ARRAY['board_members'::"text", 'executive_team'::"text", 'key_staff'::"text"])))
);


ALTER TABLE "public"."staff_form_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."template_approvals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "requested_by" "uuid" NOT NULL,
    "requested_scope" "public"."template_scope" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "comments" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."template_approvals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "scope" "public"."template_scope" DEFAULT 'personal'::"public"."template_scope" NOT NULL,
    "tags" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "default_for_sections" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "is_default" boolean DEFAULT false,
    "version" integer DEFAULT 1,
    "published" boolean DEFAULT true,
    "org_id" "uuid",
    "board_id" "uuid",
    "sections" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "permissions" "jsonb" DEFAULT '{"can_edit": [], "can_delete": []}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_template_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "section_key" "text" NOT NULL,
    "preferred_template_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_template_preferences" OWNER TO "postgres";


ALTER TABLE ONLY "public"."action_items"
    ADD CONSTRAINT "action_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agenda_items"
    ADD CONSTRAINT "agenda_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agendas"
    ADD CONSTRAINT "agendas_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."approval_requests"
    ADD CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."archived_documents"
    ADD CONSTRAINT "archived_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."board_member_audit"
    ADD CONSTRAINT "board_member_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."board_member_coi"
    ADD CONSTRAINT "board_member_coi_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."board_members"
    ADD CONSTRAINT "board_members_invite_token_key" UNIQUE ("invite_token");



ALTER TABLE ONLY "public"."board_members"
    ADD CONSTRAINT "board_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."board_memberships"
    ADD CONSTRAINT "board_memberships_board_id_user_id_key" UNIQUE ("board_id", "user_id");



ALTER TABLE ONLY "public"."board_memberships"
    ADD CONSTRAINT "board_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."board_paper_templates"
    ADD CONSTRAINT "board_paper_templates_org_id_template_name_template_type_key" UNIQUE ("org_id", "template_name", "template_type");



ALTER TABLE ONLY "public"."board_paper_templates"
    ADD CONSTRAINT "board_paper_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."board_papers"
    ADD CONSTRAINT "board_papers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."board_role_overrides"
    ADD CONSTRAINT "board_role_overrides_board_id_profile_id_role_id_key" UNIQUE ("board_id", "profile_id", "role_id");



ALTER TABLE ONLY "public"."board_role_overrides"
    ADD CONSTRAINT "board_role_overrides_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."board_settings"
    ADD CONSTRAINT "board_settings_pkey" PRIMARY KEY ("board_id");



ALTER TABLE ONLY "public"."boards"
    ADD CONSTRAINT "boards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."committee_memberships"
    ADD CONSTRAINT "committee_memberships_committee_id_member_id_key" UNIQUE ("committee_id", "member_id");



ALTER TABLE ONLY "public"."committee_memberships"
    ADD CONSTRAINT "committee_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."compliance_categories"
    ADD CONSTRAINT "compliance_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."compliance_items"
    ADD CONSTRAINT "compliance_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."compliance_reviews"
    ADD CONSTRAINT "compliance_reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."compliance_templates"
    ADD CONSTRAINT "compliance_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dashboard_metrics"
    ADD CONSTRAINT "dashboard_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dashboard_templates"
    ADD CONSTRAINT "dashboard_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dashboard_widgets"
    ADD CONSTRAINT "dashboard_widgets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_drafts"
    ADD CONSTRAINT "document_drafts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_embeddings"
    ADD CONSTRAINT "document_embeddings_document_id_chunk_index_key" UNIQUE ("document_id", "chunk_index");



ALTER TABLE ONLY "public"."document_embeddings"
    ADD CONSTRAINT "document_embeddings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_links"
    ADD CONSTRAINT "document_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_links"
    ADD CONSTRAINT "document_links_src_document_id_linked_item_type_linked_item_key" UNIQUE ("src_document_id", "linked_item_type", "linked_item_id");



ALTER TABLE ONLY "public"."document_snapshots"
    ADD CONSTRAINT "document_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_submissions"
    ADD CONSTRAINT "document_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."executive_reports"
    ADD CONSTRAINT "executive_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."extracted_decisions"
    ADD CONSTRAINT "extracted_decisions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ingest_jobs"
    ADD CONSTRAINT "ingest_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meeting_minutes"
    ADD CONSTRAINT "meeting_minutes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."org_admins"
    ADD CONSTRAINT "org_admins_org_id_admin_type_key" UNIQUE ("org_id", "admin_type");



ALTER TABLE ONLY "public"."org_admins"
    ADD CONSTRAINT "org_admins_org_id_user_id_key" UNIQUE ("org_id", "user_id");



ALTER TABLE ONLY "public"."org_admins"
    ADD CONSTRAINT "org_admins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."special_papers"
    ADD CONSTRAINT "special_papers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_form_templates"
    ADD CONSTRAINT "staff_form_templates_org_id_form_type_key" UNIQUE ("org_id", "form_type");



ALTER TABLE ONLY "public"."staff_form_templates"
    ADD CONSTRAINT "staff_form_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template_approvals"
    ADD CONSTRAINT "template_approvals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



ALTER TABLE ONLY "public"."user_template_preferences"
    ADD CONSTRAINT "user_template_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_template_preferences"
    ADD CONSTRAINT "user_template_preferences_user_id_section_key_key" UNIQUE ("user_id", "section_key");



CREATE INDEX "idx_agenda_items_agenda" ON "public"."agenda_items" USING "btree" ("agenda_id");



CREATE INDEX "idx_agendas_board" ON "public"."agendas" USING "btree" ("board_id");



CREATE INDEX "idx_approval_requests_org_id" ON "public"."approval_requests" USING "btree" ("org_id");



CREATE INDEX "idx_approval_requests_requested_by" ON "public"."approval_requests" USING "btree" ("requested_by");



CREATE INDEX "idx_approval_requests_status" ON "public"."approval_requests" USING "btree" ("status");



CREATE INDEX "idx_archived_documents_board" ON "public"."archived_documents" USING "btree" ("board_id");



CREATE INDEX "idx_archived_documents_org" ON "public"."archived_documents" USING "btree" ("org_id");



CREATE INDEX "idx_archived_documents_status" ON "public"."archived_documents" USING "btree" ("processing_status");



CREATE INDEX "idx_archived_documents_uploaded_by" ON "public"."archived_documents" USING "btree" ("uploaded_by");



CREATE INDEX "idx_board_members_reports_to" ON "public"."board_members" USING "btree" ("reports_to");



CREATE INDEX "idx_board_members_type_board" ON "public"."board_members" USING "btree" ("board_id", "member_type", "status");



CREATE INDEX "idx_board_members_user_id" ON "public"."board_members" USING "btree" ("user_id");



CREATE INDEX "idx_board_memberships_board" ON "public"."board_memberships" USING "btree" ("board_id");



CREATE INDEX "idx_board_memberships_user" ON "public"."board_memberships" USING "btree" ("user_id");



CREATE INDEX "idx_board_papers_board_id" ON "public"."board_papers" USING "btree" ("board_id");



CREATE INDEX "idx_board_papers_created_by" ON "public"."board_papers" USING "btree" ("created_by");



CREATE INDEX "idx_board_papers_org_id" ON "public"."board_papers" USING "btree" ("org_id");



CREATE INDEX "idx_board_papers_status" ON "public"."board_papers" USING "btree" ("status");



CREATE INDEX "idx_boards_org_status" ON "public"."boards" USING "btree" ("org_id", "status");



CREATE INDEX "idx_boards_parent" ON "public"."boards" USING "btree" ("parent_board_id");



CREATE INDEX "idx_boards_status" ON "public"."boards" USING "btree" ("status");



CREATE INDEX "idx_compliance_items_next_due_date" ON "public"."compliance_items" USING "btree" ("next_due_date");



COMMENT ON INDEX "public"."idx_compliance_items_next_due_date" IS 'Improves query performance for upcoming compliance items';



CREATE INDEX "idx_compliance_items_org_id" ON "public"."compliance_items" USING "btree" ("org_id");



CREATE INDEX "idx_dashboard_metrics_category" ON "public"."dashboard_metrics" USING "btree" ("category", "period_type");



CREATE INDEX "idx_dashboard_metrics_org" ON "public"."dashboard_metrics" USING "btree" ("org_id");



CREATE INDEX "idx_dashboard_templates_org" ON "public"."dashboard_templates" USING "btree" ("org_id");



CREATE INDEX "idx_dashboard_widgets_template" ON "public"."dashboard_widgets" USING "btree" ("template_id");



CREATE INDEX "idx_document_drafts_created_by" ON "public"."document_drafts" USING "btree" ("created_by");



CREATE INDEX "idx_document_drafts_section" ON "public"."document_drafts" USING "btree" ("section_key");



CREATE INDEX "idx_document_drafts_status" ON "public"."document_drafts" USING "btree" ("status");



CREATE INDEX "idx_document_embeddings_document" ON "public"."document_embeddings" USING "btree" ("document_id");



CREATE INDEX "idx_executive_reports_board_id" ON "public"."executive_reports" USING "btree" ("board_id");



CREATE INDEX "idx_executive_reports_org_id" ON "public"."executive_reports" USING "btree" ("org_id");



CREATE INDEX "idx_executive_reports_report_type" ON "public"."executive_reports" USING "btree" ("report_type");



CREATE INDEX "idx_extracted_decisions_document" ON "public"."extracted_decisions" USING "btree" ("document_id");



CREATE INDEX "idx_meeting_minutes_meeting_date" ON "public"."meeting_minutes" USING "btree" ("meeting_date");



CREATE INDEX "idx_meeting_minutes_org_id" ON "public"."meeting_minutes" USING "btree" ("org_id");



CREATE INDEX "idx_org_admins_org_id" ON "public"."org_admins" USING "btree" ("org_id");



CREATE INDEX "idx_special_papers_deadline" ON "public"."special_papers" USING "btree" ("deadline");



CREATE INDEX "idx_special_papers_org_id" ON "public"."special_papers" USING "btree" ("org_id");



CREATE INDEX "idx_templates_author" ON "public"."templates" USING "btree" ("author_id");



CREATE INDEX "idx_templates_scope" ON "public"."templates" USING "btree" ("scope");



CREATE INDEX "idx_templates_tags" ON "public"."templates" USING "gin" ("tags");



CREATE OR REPLACE TRIGGER "assign_default_role_trigger" AFTER INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."assign_default_role"();



CREATE OR REPLACE TRIGGER "organization_compliance_scan_trigger" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_compliance_scan"();



CREATE OR REPLACE TRIGGER "trig_log_submission_review" AFTER UPDATE ON "public"."document_submissions" FOR EACH ROW EXECUTE FUNCTION "public"."log_submission_review"();



CREATE OR REPLACE TRIGGER "update_action_items_updated_at" BEFORE UPDATE ON "public"."action_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_agenda_items_updated_at" BEFORE UPDATE ON "public"."agenda_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_agendas_updated_at" BEFORE UPDATE ON "public"."agendas" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_approval_requests_updated_at" BEFORE UPDATE ON "public"."approval_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_archived_documents_updated_at" BEFORE UPDATE ON "public"."archived_documents" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_board_member_coi_updated_at" BEFORE UPDATE ON "public"."board_member_coi" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_board_members_updated_at" BEFORE UPDATE ON "public"."board_members" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_board_paper_templates_updated_at" BEFORE UPDATE ON "public"."board_paper_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_board_papers_updated_at" BEFORE UPDATE ON "public"."board_papers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_board_settings_updated_at" BEFORE UPDATE ON "public"."board_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_boards_updated_at" BEFORE UPDATE ON "public"."boards" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_committee_memberships_updated_at" BEFORE UPDATE ON "public"."committee_memberships" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_compliance_items_updated_at" BEFORE UPDATE ON "public"."compliance_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_dashboard_metrics_updated_at" BEFORE UPDATE ON "public"."dashboard_metrics" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_dashboard_templates_updated_at" BEFORE UPDATE ON "public"."dashboard_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_dashboard_widgets_updated_at" BEFORE UPDATE ON "public"."dashboard_widgets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_document_drafts_updated_at" BEFORE UPDATE ON "public"."document_drafts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organizations_updated_at" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_staff_form_templates_updated_at" BEFORE UPDATE ON "public"."staff_form_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_templates_updated_at" BEFORE UPDATE ON "public"."templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_template_preferences_updated_at" BEFORE UPDATE ON "public"."user_template_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."action_items"
    ADD CONSTRAINT "action_items_agenda_item_id_fkey" FOREIGN KEY ("agenda_item_id") REFERENCES "public"."agenda_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."action_items"
    ADD CONSTRAINT "action_items_extracted_decision_id_fkey" FOREIGN KEY ("extracted_decision_id") REFERENCES "public"."extracted_decisions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."action_items"
    ADD CONSTRAINT "action_items_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."agenda_items"
    ADD CONSTRAINT "agenda_items_agenda_id_fkey" FOREIGN KEY ("agenda_id") REFERENCES "public"."agendas"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agendas"
    ADD CONSTRAINT "agendas_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."approval_requests"
    ADD CONSTRAINT "approval_requests_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."approval_requests"
    ADD CONSTRAINT "approval_requests_first_approver_fkey" FOREIGN KEY ("first_approver") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."approval_requests"
    ADD CONSTRAINT "approval_requests_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."approval_requests"
    ADD CONSTRAINT "approval_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."approval_requests"
    ADD CONSTRAINT "approval_requests_second_approver_fkey" FOREIGN KEY ("second_approver") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."archived_documents"
    ADD CONSTRAINT "archived_documents_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."archived_documents"
    ADD CONSTRAINT "archived_documents_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."archived_documents"
    ADD CONSTRAINT "archived_documents_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "public"."document_snapshots"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."archived_documents"
    ADD CONSTRAINT "archived_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."board_member_audit"
    ADD CONSTRAINT "board_member_audit_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."board_member_audit"
    ADD CONSTRAINT "board_member_audit_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."board_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."board_member_coi"
    ADD CONSTRAINT "board_member_coi_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."board_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."board_members"
    ADD CONSTRAINT "board_members_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."board_members"
    ADD CONSTRAINT "board_members_reports_to_fkey" FOREIGN KEY ("reports_to") REFERENCES "public"."board_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."board_members"
    ADD CONSTRAINT "board_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."board_memberships"
    ADD CONSTRAINT "board_memberships_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."board_memberships"
    ADD CONSTRAINT "board_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."board_paper_templates"
    ADD CONSTRAINT "board_paper_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."board_paper_templates"
    ADD CONSTRAINT "board_paper_templates_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."board_papers"
    ADD CONSTRAINT "board_papers_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."board_papers"
    ADD CONSTRAINT "board_papers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."board_papers"
    ADD CONSTRAINT "board_papers_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."board_papers"
    ADD CONSTRAINT "board_papers_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."board_paper_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."board_role_overrides"
    ADD CONSTRAINT "board_role_overrides_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."board_role_overrides"
    ADD CONSTRAINT "board_role_overrides_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."board_role_overrides"
    ADD CONSTRAINT "board_role_overrides_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id");



ALTER TABLE ONLY "public"."board_settings"
    ADD CONSTRAINT "board_settings_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."boards"
    ADD CONSTRAINT "boards_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."boards"
    ADD CONSTRAINT "boards_parent_board_id_fkey" FOREIGN KEY ("parent_board_id") REFERENCES "public"."boards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."committee_memberships"
    ADD CONSTRAINT "committee_memberships_committee_id_fkey" FOREIGN KEY ("committee_id") REFERENCES "public"."boards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."committee_memberships"
    ADD CONSTRAINT "committee_memberships_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."board_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."compliance_items"
    ADD CONSTRAINT "compliance_items_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."compliance_items"
    ADD CONSTRAINT "compliance_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."compliance_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."compliance_items"
    ADD CONSTRAINT "compliance_items_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."compliance_reviews"
    ADD CONSTRAINT "compliance_reviews_compliance_item_id_fkey" FOREIGN KEY ("compliance_item_id") REFERENCES "public"."compliance_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."compliance_reviews"
    ADD CONSTRAINT "compliance_reviews_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."compliance_reviews"
    ADD CONSTRAINT "compliance_reviews_signed_off_by_fkey" FOREIGN KEY ("signed_off_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."compliance_templates"
    ADD CONSTRAINT "compliance_templates_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."compliance_categories"("id");



ALTER TABLE ONLY "public"."dashboard_metrics"
    ADD CONSTRAINT "dashboard_metrics_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."dashboard_metrics"
    ADD CONSTRAINT "dashboard_metrics_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dashboard_templates"
    ADD CONSTRAINT "dashboard_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."dashboard_templates"
    ADD CONSTRAINT "dashboard_templates_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dashboard_widgets"
    ADD CONSTRAINT "dashboard_widgets_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."dashboard_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_drafts"
    ADD CONSTRAINT "document_drafts_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_drafts"
    ADD CONSTRAINT "document_drafts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_drafts"
    ADD CONSTRAINT "document_drafts_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_drafts"
    ADD CONSTRAINT "document_drafts_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."document_embeddings"
    ADD CONSTRAINT "document_embeddings_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."archived_documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_links"
    ADD CONSTRAINT "document_links_src_document_id_fkey" FOREIGN KEY ("src_document_id") REFERENCES "public"."archived_documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_submissions"
    ADD CONSTRAINT "document_submissions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."archived_documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_submissions"
    ADD CONSTRAINT "document_submissions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."document_submissions"
    ADD CONSTRAINT "document_submissions_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."executive_reports"
    ADD CONSTRAINT "executive_reports_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id");



ALTER TABLE ONLY "public"."executive_reports"
    ADD CONSTRAINT "executive_reports_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."executive_reports"
    ADD CONSTRAINT "executive_reports_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."extracted_decisions"
    ADD CONSTRAINT "extracted_decisions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."archived_documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ingest_jobs"
    ADD CONSTRAINT "ingest_jobs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ingest_jobs"
    ADD CONSTRAINT "ingest_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."meeting_minutes"
    ADD CONSTRAINT "meeting_minutes_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."meeting_minutes"
    ADD CONSTRAINT "meeting_minutes_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id");



ALTER TABLE ONLY "public"."meeting_minutes"
    ADD CONSTRAINT "meeting_minutes_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."meeting_minutes"
    ADD CONSTRAINT "meeting_minutes_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."org_admins"
    ADD CONSTRAINT "org_admins_appointed_by_fkey" FOREIGN KEY ("appointed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."org_admins"
    ADD CONSTRAINT "org_admins_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."org_admins"
    ADD CONSTRAINT "org_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."special_papers"
    ADD CONSTRAINT "special_papers_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id");



ALTER TABLE ONLY "public"."special_papers"
    ADD CONSTRAINT "special_papers_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."special_papers"
    ADD CONSTRAINT "special_papers_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."template_approvals"
    ADD CONSTRAINT "template_approvals_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."template_approvals"
    ADD CONSTRAINT "template_approvals_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."template_approvals"
    ADD CONSTRAINT "template_approvals_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."templates"
    ADD CONSTRAINT "templates_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_template_preferences"
    ADD CONSTRAINT "user_template_preferences_preferred_template_id_fkey" FOREIGN KEY ("preferred_template_id") REFERENCES "public"."templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_template_preferences"
    ADD CONSTRAINT "user_template_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins and chairs can delete board members" ON "public"."board_members" FOR DELETE USING (("public"."has_role"("auth"."uid"(), 'org_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'chair'::"public"."app_role")));



CREATE POLICY "Admins and chairs can update board members" ON "public"."board_members" FOR UPDATE USING (("public"."has_role"("auth"."uid"(), 'org_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'chair'::"public"."app_role") OR ("user_id" = "auth"."uid"()))) WITH CHECK (("public"."has_role"("auth"."uid"(), 'org_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'chair'::"public"."app_role") OR ("user_id" = "auth"."uid"())));



CREATE POLICY "Admins and chairs can update settings" ON "public"."board_settings" FOR UPDATE USING (("public"."has_role"("auth"."uid"(), 'chair'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'org_admin'::"public"."app_role")));



CREATE POLICY "Admins can delete compliance items" ON "public"."compliance_items" FOR DELETE USING (("public"."has_role"("auth"."uid"(), 'org_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'chair'::"public"."app_role")));



CREATE POLICY "Admins can manage role overrides" ON "public"."board_role_overrides" USING (("public"."has_role"("auth"."uid"(), 'org_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'chair'::"public"."app_role")));



CREATE POLICY "Admins can manage templates" ON "public"."staff_form_templates" USING (("public"."has_role"("auth"."uid"(), 'org_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'chair'::"public"."app_role")));



CREATE POLICY "Admins can manage user roles" ON "public"."user_roles" USING (("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'org_admin'::"public"."app_role")));



CREATE POLICY "Admins can update approvals" ON "public"."template_approvals" FOR UPDATE USING (("public"."has_role"("auth"."uid"(), 'org_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'chair'::"public"."app_role")));



CREATE POLICY "Admins can update board papers in their org" ON "public"."board_papers" FOR UPDATE USING (("public"."has_role"("auth"."uid"(), 'org_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'chair'::"public"."app_role")));



CREATE POLICY "Admins can update minutes" ON "public"."meeting_minutes" FOR UPDATE USING (("public"."has_role"("auth"."uid"(), 'org_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'chair'::"public"."app_role")));



CREATE POLICY "Admins can update reports" ON "public"."executive_reports" FOR UPDATE USING (("public"."has_role"("auth"."uid"(), 'org_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'chair'::"public"."app_role")));



CREATE POLICY "Admins can update special papers" ON "public"."special_papers" FOR UPDATE USING (("public"."has_role"("auth"."uid"(), 'org_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'chair'::"public"."app_role")));



CREATE POLICY "Admins can view all memberships" ON "public"."board_memberships" FOR SELECT TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'org_admin'::"public"."app_role")));



CREATE POLICY "Admins can view all user roles" ON "public"."user_roles" FOR SELECT USING (("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'org_admin'::"public"."app_role")));



CREATE POLICY "Admins can view audit log" ON "public"."audit_log" FOR SELECT TO "authenticated" USING (("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'org_admin'::"public"."app_role")));



CREATE POLICY "Admins can view audit logs" ON "public"."board_member_audit" FOR SELECT USING (("public"."has_role"("auth"."uid"(), 'org_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'chair'::"public"."app_role")));



CREATE POLICY "Anyone can view compliance categories" ON "public"."compliance_categories" FOR SELECT USING (true);



CREATE POLICY "Anyone can view compliance templates" ON "public"."compliance_templates" FOR SELECT USING (true);



CREATE POLICY "Anyone can view role metadata" ON "public"."roles" FOR SELECT USING (true);



CREATE POLICY "Approvers can review submissions" ON "public"."document_submissions" FOR UPDATE USING (("public"."has_role"("auth"."uid"(), 'chair'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'org_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'executive'::"public"."app_role")));



CREATE POLICY "Approvers can update approval requests" ON "public"."approval_requests" FOR UPDATE USING ((("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) AND ("public"."has_role"("auth"."uid"(), 'org_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'chair'::"public"."app_role"))));



CREATE POLICY "Authenticated users can create boards" ON "public"."boards" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can create snapshots" ON "public"."document_snapshots" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Board members can insert members in their boards" ON "public"."board_members" FOR INSERT WITH CHECK ((("board_id" IN ( SELECT "board_memberships"."board_id"
   FROM "public"."board_memberships"
  WHERE ("board_memberships"."user_id" = "auth"."uid"()))) OR "public"."has_role"("auth"."uid"(), 'org_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'chair'::"public"."app_role")));



CREATE POLICY "Board members can view COI in their boards" ON "public"."board_member_coi" FOR SELECT USING (("member_id" IN ( SELECT "board_members"."id"
   FROM "public"."board_members"
  WHERE ("board_members"."board_id" IN ( SELECT "board_memberships"."board_id"
           FROM "public"."board_memberships"
          WHERE ("board_memberships"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Board members can view decisions" ON "public"."extracted_decisions" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM ("public"."archived_documents" "ad"
     JOIN "public"."board_memberships" "bm" ON (("bm"."board_id" = "ad"."board_id")))
  WHERE (("ad"."id" = "extracted_decisions"."document_id") AND ("bm"."user_id" = "auth"."uid"())))) OR "public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'org_admin'::"public"."app_role")));



CREATE POLICY "Board members can view documents" ON "public"."archived_documents" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."board_memberships"
  WHERE (("board_memberships"."user_id" = "auth"."uid"()) AND ("board_memberships"."board_id" = "archived_documents"."board_id")))) OR "public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'org_admin'::"public"."app_role")));



CREATE POLICY "Board members can view members in their boards" ON "public"."board_members" FOR SELECT USING (("board_id" IN ( SELECT "board_memberships"."board_id"
   FROM "public"."board_memberships"
  WHERE ("board_memberships"."user_id" = "auth"."uid"()))));



CREATE POLICY "Board members can view role overrides" ON "public"."board_role_overrides" FOR SELECT USING (("board_id" IN ( SELECT "board_memberships"."board_id"
   FROM "public"."board_memberships"
  WHERE ("board_memberships"."user_id" = "auth"."uid"()))));



CREATE POLICY "Board members can view settings" ON "public"."board_settings" FOR SELECT USING (("board_id" IN ( SELECT "board_memberships"."board_id"
   FROM "public"."board_memberships"
  WHERE ("board_memberships"."user_id" = "auth"."uid"()))));



CREATE POLICY "Members can complete their own profile" ON "public"."board_members" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Members can manage their own COI" ON "public"."board_member_coi" USING (("member_id" IN ( SELECT "board_members"."id"
   FROM "public"."board_members"
  WHERE ("board_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Only admins can assign roles" ON "public"."user_roles" FOR INSERT WITH CHECK (("public"."has_role"("auth"."uid"(), 'org_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")));



CREATE POLICY "Only admins can delete roles" ON "public"."user_roles" FOR DELETE USING (("public"."has_role"("auth"."uid"(), 'org_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")));



CREATE POLICY "Only admins can modify roles" ON "public"."user_roles" FOR UPDATE USING (("public"."has_role"("auth"."uid"(), 'org_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")));



CREATE POLICY "Org admins can manage admin assignments" ON "public"."org_admins" USING (("public"."has_role"("auth"."uid"(), 'org_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role")));



CREATE POLICY "Org members can delete boards" ON "public"."boards" FOR DELETE USING (("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Org members can update boards" ON "public"."boards" FOR UPDATE USING (("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Restrict org creation to users without org" ON "public"."organizations" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."org_id" IS NULL))));



CREATE POLICY "Super admins can manage roles" ON "public"."roles" USING ("public"."has_role"("auth"."uid"(), 'super_admin'::"public"."app_role"));



CREATE POLICY "Users can create approval requests" ON "public"."approval_requests" FOR INSERT WITH CHECK ((("requested_by" = "auth"."uid"()) AND ("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "Users can create approval requests" ON "public"."template_approvals" FOR INSERT WITH CHECK (("requested_by" = "auth"."uid"()));



CREATE POLICY "Users can create board papers" ON "public"."board_papers" FOR INSERT WITH CHECK ((("created_by" = "auth"."uid"()) AND ("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "Users can create compliance items in their org" ON "public"."compliance_items" FOR INSERT WITH CHECK (("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can create compliance reviews" ON "public"."compliance_reviews" FOR INSERT WITH CHECK (("reviewed_by" = "auth"."uid"()));



CREATE POLICY "Users can create drafts" ON "public"."document_drafts" FOR INSERT WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "Users can create metrics" ON "public"."dashboard_metrics" FOR INSERT WITH CHECK ((("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) AND ("created_by" = "auth"."uid"())));



CREATE POLICY "Users can create personal templates" ON "public"."templates" FOR INSERT WITH CHECK ((("author_id" = "auth"."uid"()) AND ("scope" = 'personal'::"public"."template_scope")));



CREATE POLICY "Users can create submissions" ON "public"."document_submissions" FOR INSERT WITH CHECK (("submitted_by" = "auth"."uid"()));



CREATE POLICY "Users can create templates" ON "public"."dashboard_templates" FOR INSERT WITH CHECK ((("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) AND ("created_by" = "auth"."uid"())));



CREATE POLICY "Users can delete own metrics" ON "public"."dashboard_metrics" FOR DELETE USING (("created_by" = "auth"."uid"()));



CREATE POLICY "Users can delete own templates" ON "public"."dashboard_templates" FOR DELETE USING (("created_by" = "auth"."uid"()));



CREATE POLICY "Users can delete their org templates" ON "public"."board_paper_templates" FOR DELETE USING (("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can delete their own board papers" ON "public"."board_papers" FOR DELETE USING (("created_by" = "auth"."uid"()));



CREATE POLICY "Users can delete their own drafts" ON "public"."document_drafts" FOR DELETE USING (("created_by" = "auth"."uid"()));



CREATE POLICY "Users can delete their own templates" ON "public"."templates" FOR DELETE USING ((("author_id" = "auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'org_admin'::"public"."app_role")));



CREATE POLICY "Users can insert documents" ON "public"."archived_documents" FOR INSERT WITH CHECK ((("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) AND ("uploaded_by" = "auth"."uid"())));



CREATE POLICY "Users can insert ingest jobs" ON "public"."ingest_jobs" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert templates" ON "public"."board_paper_templates" FOR INSERT WITH CHECK ((("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) AND ("created_by" = "auth"."uid"())));



CREATE POLICY "Users can manage committee memberships" ON "public"."committee_memberships" USING (("committee_id" IN ( SELECT "boards"."id"
   FROM "public"."boards"
  WHERE ("boards"."org_id" IN ( SELECT "profiles"."org_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can manage their own preferences" ON "public"."user_template_preferences" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can manage widgets" ON "public"."dashboard_widgets" USING (("template_id" IN ( SELECT "dashboard_templates"."id"
   FROM "public"."dashboard_templates"
  WHERE ("dashboard_templates"."org_id" IN ( SELECT "profiles"."org_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can update compliance items in their org" ON "public"."compliance_items" FOR UPDATE USING (("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update org metrics" ON "public"."dashboard_metrics" FOR UPDATE USING (("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update org templates" ON "public"."dashboard_templates" FOR UPDATE USING (("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "Users can update their ingest jobs" ON "public"."ingest_jobs" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their org templates" ON "public"."board_paper_templates" FOR UPDATE USING (("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update their organization" ON "public"."organizations" FOR UPDATE USING (("id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))) WITH CHECK (("id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update their own board papers" ON "public"."board_papers" FOR UPDATE USING (("created_by" = "auth"."uid"()));



CREATE POLICY "Users can update their own drafts" ON "public"."document_drafts" FOR UPDATE USING (("created_by" = "auth"."uid"()));



CREATE POLICY "Users can update their own minutes" ON "public"."meeting_minutes" FOR UPDATE USING (("uploaded_by" = "auth"."uid"()));



CREATE POLICY "Users can update their own reports" ON "public"."executive_reports" FOR UPDATE USING (("uploaded_by" = "auth"."uid"()));



CREATE POLICY "Users can update their own reviews" ON "public"."compliance_reviews" FOR UPDATE USING (("reviewed_by" = "auth"."uid"()));



CREATE POLICY "Users can update their own special papers" ON "public"."special_papers" FOR UPDATE USING (("uploaded_by" = "auth"."uid"()));



CREATE POLICY "Users can update their own templates" ON "public"."templates" FOR UPDATE USING ((("author_id" = "auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'org_admin'::"public"."app_role")));



CREATE POLICY "Users can upload minutes" ON "public"."meeting_minutes" FOR INSERT WITH CHECK ((("uploaded_by" = "auth"."uid"()) AND ("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "Users can upload reports" ON "public"."executive_reports" FOR INSERT WITH CHECK ((("uploaded_by" = "auth"."uid"()) AND ("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "Users can upload special papers" ON "public"."special_papers" FOR INSERT WITH CHECK ((("uploaded_by" = "auth"."uid"()) AND ("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "Users can view action items" ON "public"."action_items" FOR SELECT USING ((("agenda_item_id" IN ( SELECT "ai"."id"
   FROM ("public"."agenda_items" "ai"
     JOIN "public"."agendas" "a" ON (("ai"."agenda_id" = "a"."id")))
  WHERE ("a"."board_id" IN ( SELECT "board_memberships"."board_id"
           FROM "public"."board_memberships"
          WHERE ("board_memberships"."user_id" = "auth"."uid"()))))) OR ("owner_id" = "auth"."uid"())));



CREATE POLICY "Users can view admins in their org" ON "public"."org_admins" FOR SELECT USING (("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view agenda items" ON "public"."agenda_items" FOR SELECT USING (("agenda_id" IN ( SELECT "agendas"."id"
   FROM "public"."agendas"
  WHERE ("agendas"."board_id" IN ( SELECT "board_memberships"."board_id"
           FROM "public"."board_memberships"
          WHERE ("board_memberships"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view agendas" ON "public"."agendas" FOR SELECT USING (("board_id" IN ( SELECT "board_memberships"."board_id"
   FROM "public"."board_memberships"
  WHERE ("board_memberships"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view approval requests" ON "public"."template_approvals" FOR SELECT USING ((("requested_by" = "auth"."uid"()) OR "public"."has_role"("auth"."uid"(), 'org_admin'::"public"."app_role") OR "public"."has_role"("auth"."uid"(), 'chair'::"public"."app_role")));



CREATE POLICY "Users can view approval requests in their org" ON "public"."approval_requests" FOR SELECT USING (("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view board papers in their org" ON "public"."board_papers" FOR SELECT USING (("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view boards in their org" ON "public"."boards" FOR SELECT USING (("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."org_id" IS NOT NULL)))));



CREATE POLICY "Users can view committee memberships in their org" ON "public"."committee_memberships" FOR SELECT USING (("committee_id" IN ( SELECT "boards"."id"
   FROM "public"."boards"
  WHERE ("boards"."org_id" IN ( SELECT "profiles"."org_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can view compliance items in their org" ON "public"."compliance_items" FOR SELECT USING (("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view compliance reviews in their org" ON "public"."compliance_reviews" FOR SELECT USING (("compliance_item_id" IN ( SELECT "compliance_items"."id"
   FROM "public"."compliance_items"
  WHERE ("compliance_items"."org_id" IN ( SELECT "profiles"."org_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can view document links" ON "public"."document_links" FOR SELECT USING (("src_document_id" IN ( SELECT "archived_documents"."id"
   FROM "public"."archived_documents"
  WHERE ("archived_documents"."org_id" IN ( SELECT "profiles"."org_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can view document snapshots" ON "public"."document_snapshots" FOR SELECT USING (("id" IN ( SELECT "archived_documents"."snapshot_id"
   FROM "public"."archived_documents"
  WHERE ("archived_documents"."org_id" IN ( SELECT "profiles"."org_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can view embeddings" ON "public"."document_embeddings" FOR SELECT USING (("document_id" IN ( SELECT "archived_documents"."id"
   FROM "public"."archived_documents"
  WHERE ("archived_documents"."org_id" IN ( SELECT "profiles"."org_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can view extracted decisions" ON "public"."extracted_decisions" FOR SELECT USING (("document_id" IN ( SELECT "archived_documents"."id"
   FROM "public"."archived_documents"
  WHERE ("archived_documents"."org_id" IN ( SELECT "profiles"."org_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can view minutes in their org" ON "public"."meeting_minutes" FOR SELECT USING (("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view org metrics" ON "public"."dashboard_metrics" FOR SELECT USING (("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view org profiles" ON "public"."profiles" FOR SELECT USING ((("org_id" IS NOT NULL) AND ("org_id" = "public"."get_user_org_id"("auth"."uid"()))));



CREATE POLICY "Users can view org templates" ON "public"."dashboard_templates" FOR SELECT USING (("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view own memberships" ON "public"."board_memberships" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("id" = "auth"."uid"()));



CREATE POLICY "Users can view profiles in same org" ON "public"."profiles" FOR SELECT USING ((("org_id" IN ( SELECT "p"."org_id"
   FROM "public"."profiles" "p"
  WHERE ("p"."id" = "auth"."uid"()))) OR ("id" = "auth"."uid"())));



CREATE POLICY "Users can view reports in their org" ON "public"."executive_reports" FOR SELECT USING (("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view special papers in their org" ON "public"."special_papers" FOR SELECT USING (("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view submissions in their org" ON "public"."document_submissions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."archived_documents" "ad"
     JOIN "public"."profiles" "p" ON (("p"."org_id" = "ad"."org_id")))
  WHERE (("ad"."id" = "document_submissions"."document_id") AND ("p"."id" = "auth"."uid"())))));



CREATE POLICY "Users can view templates in their scope" ON "public"."templates" FOR SELECT USING (((("scope" = 'personal'::"public"."template_scope") AND ("author_id" = "auth"."uid"())) OR (("scope" = 'team'::"public"."template_scope") AND ("board_id" IN ( SELECT "board_memberships"."board_id"
   FROM "public"."board_memberships"
  WHERE ("board_memberships"."user_id" = "auth"."uid"())))) OR (("scope" = 'organization'::"public"."template_scope") AND ("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))) OR ("published" = true)));



CREATE POLICY "Users can view their ingest jobs" ON "public"."ingest_jobs" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their org templates" ON "public"."board_paper_templates" FOR SELECT USING (("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view their org templates" ON "public"."staff_form_templates" FOR SELECT USING (("org_id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view their organization" ON "public"."organizations" FOR SELECT USING (("id" IN ( SELECT "profiles"."org_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own drafts" ON "public"."document_drafts" FOR SELECT USING ((("created_by" = "auth"."uid"()) OR ("board_id" IN ( SELECT "board_memberships"."board_id"
   FROM "public"."board_memberships"
  WHERE ("board_memberships"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own roles" ON "public"."user_roles" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view widgets" ON "public"."dashboard_widgets" FOR SELECT USING (("template_id" IN ( SELECT "dashboard_templates"."id"
   FROM "public"."dashboard_templates"
  WHERE ("dashboard_templates"."org_id" IN ( SELECT "profiles"."org_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



ALTER TABLE "public"."action_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agenda_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agendas" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."approval_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."archived_documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."board_member_audit" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."board_member_coi" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."board_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."board_memberships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."board_paper_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."board_papers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."board_role_overrides" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."board_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."boards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."committee_memberships" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."compliance_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."compliance_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."compliance_reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."compliance_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dashboard_metrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dashboard_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dashboard_widgets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."document_drafts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."document_embeddings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."document_links" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."document_snapshots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."document_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."executive_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."extracted_decisions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ingest_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."meeting_minutes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."org_admins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."special_papers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_form_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."template_approvals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_template_preferences" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";




































































































































































































































































































































































































































































































































GRANT ALL ON FUNCTION "public"."assign_default_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."assign_default_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_default_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auth_check"("table_name" "text", "operation" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."auth_check"("table_name" "text", "operation" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auth_check"("table_name" "text", "operation" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_next_due_date"("last_date" "date", "freq" "public"."compliance_frequency") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_next_due_date"("last_date" "date", "freq" "public"."compliance_frequency") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_next_due_date"("last_date" "date", "freq" "public"."compliance_frequency") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_default_staff_form_templates"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_default_staff_form_templates"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_staff_form_templates"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_member_invite_token"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_member_invite_token"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_member_invite_token"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_org_id"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_org_id"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_org_id"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_board_member"("user_id" "uuid", "board_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_board_member"("user_id" "uuid", "board_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_board_member"("user_id" "uuid", "board_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_audit_entry"("_entity_type" "text", "_entity_id" "uuid", "_action" "text", "_detail_json" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."log_audit_entry"("_entity_type" "text", "_entity_id" "uuid", "_action" "text", "_detail_json" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_audit_entry"("_entity_type" "text", "_entity_id" "uuid", "_action" "text", "_detail_json" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_board_member_audit"("_member_id" "uuid", "_field_name" "text", "_change_type" "text", "_old_value" "text", "_new_value" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."log_board_member_audit"("_member_id" "uuid", "_field_name" "text", "_change_type" "text", "_old_value" "text", "_new_value" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_board_member_audit"("_member_id" "uuid", "_field_name" "text", "_change_type" "text", "_old_value" "text", "_new_value" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_submission_review"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_submission_review"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_submission_review"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_compliance_scan"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_compliance_scan"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_compliance_scan"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_can_create_in_org"("check_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_can_create_in_org"("check_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_can_create_in_org"("check_org_id" "uuid") TO "service_role";




































GRANT ALL ON TABLE "public"."action_items" TO "anon";
GRANT ALL ON TABLE "public"."action_items" TO "authenticated";
GRANT ALL ON TABLE "public"."action_items" TO "service_role";



GRANT ALL ON TABLE "public"."agenda_items" TO "anon";
GRANT ALL ON TABLE "public"."agenda_items" TO "authenticated";
GRANT ALL ON TABLE "public"."agenda_items" TO "service_role";



GRANT ALL ON TABLE "public"."agendas" TO "anon";
GRANT ALL ON TABLE "public"."agendas" TO "authenticated";
GRANT ALL ON TABLE "public"."agendas" TO "service_role";



GRANT ALL ON TABLE "public"."approval_requests" TO "anon";
GRANT ALL ON TABLE "public"."approval_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."approval_requests" TO "service_role";



GRANT ALL ON TABLE "public"."archived_documents" TO "anon";
GRANT ALL ON TABLE "public"."archived_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."archived_documents" TO "service_role";



GRANT ALL ON TABLE "public"."audit_log" TO "anon";
GRANT ALL ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."board_member_audit" TO "anon";
GRANT ALL ON TABLE "public"."board_member_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."board_member_audit" TO "service_role";



GRANT ALL ON TABLE "public"."board_member_coi" TO "anon";
GRANT ALL ON TABLE "public"."board_member_coi" TO "authenticated";
GRANT ALL ON TABLE "public"."board_member_coi" TO "service_role";



GRANT ALL ON TABLE "public"."board_members" TO "anon";
GRANT ALL ON TABLE "public"."board_members" TO "authenticated";
GRANT ALL ON TABLE "public"."board_members" TO "service_role";



GRANT ALL ON TABLE "public"."board_memberships" TO "anon";
GRANT ALL ON TABLE "public"."board_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."board_memberships" TO "service_role";



GRANT ALL ON TABLE "public"."board_paper_templates" TO "anon";
GRANT ALL ON TABLE "public"."board_paper_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."board_paper_templates" TO "service_role";



GRANT ALL ON TABLE "public"."board_papers" TO "anon";
GRANT ALL ON TABLE "public"."board_papers" TO "authenticated";
GRANT ALL ON TABLE "public"."board_papers" TO "service_role";



GRANT ALL ON TABLE "public"."board_role_overrides" TO "anon";
GRANT ALL ON TABLE "public"."board_role_overrides" TO "authenticated";
GRANT ALL ON TABLE "public"."board_role_overrides" TO "service_role";



GRANT ALL ON TABLE "public"."board_settings" TO "anon";
GRANT ALL ON TABLE "public"."board_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."board_settings" TO "service_role";



GRANT ALL ON TABLE "public"."boards" TO "anon";
GRANT ALL ON TABLE "public"."boards" TO "authenticated";
GRANT ALL ON TABLE "public"."boards" TO "service_role";



GRANT ALL ON TABLE "public"."committee_memberships" TO "anon";
GRANT ALL ON TABLE "public"."committee_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."committee_memberships" TO "service_role";



GRANT ALL ON TABLE "public"."compliance_categories" TO "anon";
GRANT ALL ON TABLE "public"."compliance_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."compliance_categories" TO "service_role";



GRANT ALL ON TABLE "public"."compliance_items" TO "anon";
GRANT ALL ON TABLE "public"."compliance_items" TO "authenticated";
GRANT ALL ON TABLE "public"."compliance_items" TO "service_role";



GRANT ALL ON TABLE "public"."compliance_reviews" TO "anon";
GRANT ALL ON TABLE "public"."compliance_reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."compliance_reviews" TO "service_role";



GRANT ALL ON TABLE "public"."compliance_templates" TO "anon";
GRANT ALL ON TABLE "public"."compliance_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."compliance_templates" TO "service_role";



GRANT ALL ON TABLE "public"."dashboard_metrics" TO "anon";
GRANT ALL ON TABLE "public"."dashboard_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."dashboard_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."dashboard_templates" TO "anon";
GRANT ALL ON TABLE "public"."dashboard_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."dashboard_templates" TO "service_role";



GRANT ALL ON TABLE "public"."dashboard_widgets" TO "anon";
GRANT ALL ON TABLE "public"."dashboard_widgets" TO "authenticated";
GRANT ALL ON TABLE "public"."dashboard_widgets" TO "service_role";



GRANT ALL ON TABLE "public"."document_drafts" TO "anon";
GRANT ALL ON TABLE "public"."document_drafts" TO "authenticated";
GRANT ALL ON TABLE "public"."document_drafts" TO "service_role";



GRANT ALL ON TABLE "public"."document_embeddings" TO "anon";
GRANT ALL ON TABLE "public"."document_embeddings" TO "authenticated";
GRANT ALL ON TABLE "public"."document_embeddings" TO "service_role";



GRANT ALL ON TABLE "public"."document_links" TO "anon";
GRANT ALL ON TABLE "public"."document_links" TO "authenticated";
GRANT ALL ON TABLE "public"."document_links" TO "service_role";



GRANT ALL ON TABLE "public"."document_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."document_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."document_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."document_submissions" TO "anon";
GRANT ALL ON TABLE "public"."document_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."document_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."executive_reports" TO "anon";
GRANT ALL ON TABLE "public"."executive_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."executive_reports" TO "service_role";



GRANT ALL ON TABLE "public"."extracted_decisions" TO "anon";
GRANT ALL ON TABLE "public"."extracted_decisions" TO "authenticated";
GRANT ALL ON TABLE "public"."extracted_decisions" TO "service_role";



GRANT ALL ON TABLE "public"."ingest_jobs" TO "anon";
GRANT ALL ON TABLE "public"."ingest_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."ingest_jobs" TO "service_role";



GRANT ALL ON TABLE "public"."meeting_minutes" TO "anon";
GRANT ALL ON TABLE "public"."meeting_minutes" TO "authenticated";
GRANT ALL ON TABLE "public"."meeting_minutes" TO "service_role";



GRANT ALL ON TABLE "public"."org_admins" TO "anon";
GRANT ALL ON TABLE "public"."org_admins" TO "authenticated";
GRANT ALL ON TABLE "public"."org_admins" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON TABLE "public"."special_papers" TO "anon";
GRANT ALL ON TABLE "public"."special_papers" TO "authenticated";
GRANT ALL ON TABLE "public"."special_papers" TO "service_role";



GRANT ALL ON TABLE "public"."staff_form_templates" TO "anon";
GRANT ALL ON TABLE "public"."staff_form_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_form_templates" TO "service_role";



GRANT ALL ON TABLE "public"."template_approvals" TO "anon";
GRANT ALL ON TABLE "public"."template_approvals" TO "authenticated";
GRANT ALL ON TABLE "public"."template_approvals" TO "service_role";



GRANT ALL ON TABLE "public"."templates" TO "anon";
GRANT ALL ON TABLE "public"."templates" TO "authenticated";
GRANT ALL ON TABLE "public"."templates" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."user_template_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_template_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_template_preferences" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "Authenticated users can upload reports"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'council-data'::text) AND (auth.uid() IS NOT NULL)));



  create policy "Users can delete their organization's files"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'council-data'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can delete their organization's reports"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'council-data'::text) AND (auth.uid() IS NOT NULL)));



  create policy "Users can delete their own minutes"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'meeting-minutes'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can delete their own reports"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'executive-reports'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can delete their own special papers"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'special-papers'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can delete their uploaded documents"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'board-documents'::text) AND (owner = auth.uid())));



  create policy "Users can upload documents to their org"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check ((bucket_id = 'board-documents'::text));



  create policy "Users can upload files to their organization"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'council-data'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can upload minutes to their org folder"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'meeting-minutes'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can upload reports to their org folder"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'executive-reports'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can upload special papers to their org folder"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'special-papers'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can view documents in their org"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'board-documents'::text));



  create policy "Users can view minutes in their org"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'meeting-minutes'::text) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));



  create policy "Users can view reports from their organization"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'council-data'::text) AND (auth.uid() IS NOT NULL)));



  create policy "Users can view reports in their org"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'executive-reports'::text) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));



  create policy "Users can view special papers in their org"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'special-papers'::text) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));



  create policy "Users can view their organization's files"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'council-data'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



