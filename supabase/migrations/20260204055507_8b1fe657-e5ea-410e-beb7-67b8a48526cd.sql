-- Migration: Move sensitive PII from board_members to board_members_sensitive
-- This addresses the security issue: EXPOSED_SENSITIVE_DATA

-- Step 1: Add missing columns to board_members_sensitive
ALTER TABLE public.board_members_sensitive
ADD COLUMN IF NOT EXISTS date_of_birth date,
ADD COLUMN IF NOT EXISTS personal_mobile text,
ADD COLUMN IF NOT EXISTS personal_email text;

-- Step 2: Migrate existing data - update existing sensitive records
UPDATE public.board_members_sensitive bms
SET 
  date_of_birth = bm.date_of_birth,
  personal_mobile = bm.personal_mobile,
  personal_email = bm.personal_email,
  home_address = COALESCE(bms.home_address, bm.home_address),
  health_notes = COALESCE(bms.health_notes, bm.health_notes),
  emergency_contact_name = COALESCE(bms.emergency_contact_name, bm.emergency_contact_name),
  emergency_contact_phone = COALESCE(bms.emergency_contact_phone, bm.emergency_contact_phone),
  sensitive_notes = COALESCE(bms.sensitive_notes, bm.sensitive_notes),
  national_id = COALESCE(bms.national_id, bm.national_id)
FROM public.board_members bm
WHERE bms.member_id = bm.id;

-- Step 3: Create sensitive records for members that don't have one yet
INSERT INTO public.board_members_sensitive (
  member_id,
  date_of_birth,
  personal_mobile,
  personal_email,
  home_address,
  health_notes,
  emergency_contact_name,
  emergency_contact_phone,
  sensitive_notes,
  national_id
)
SELECT 
  bm.id,
  bm.date_of_birth,
  bm.personal_mobile,
  bm.personal_email,
  bm.home_address,
  bm.health_notes,
  bm.emergency_contact_name,
  bm.emergency_contact_phone,
  bm.sensitive_notes,
  bm.national_id
FROM public.board_members bm
WHERE NOT EXISTS (
  SELECT 1 FROM public.board_members_sensitive bms WHERE bms.member_id = bm.id
)
AND (
  bm.date_of_birth IS NOT NULL OR
  bm.personal_mobile IS NOT NULL OR
  bm.personal_email IS NOT NULL OR
  bm.home_address IS NOT NULL OR
  bm.health_notes IS NOT NULL OR
  bm.emergency_contact_name IS NOT NULL OR
  bm.emergency_contact_phone IS NOT NULL OR
  bm.sensitive_notes IS NOT NULL OR
  bm.national_id IS NOT NULL
);

-- Step 4: Drop sensitive columns from board_members table
ALTER TABLE public.board_members
DROP COLUMN IF EXISTS date_of_birth,
DROP COLUMN IF EXISTS personal_mobile,
DROP COLUMN IF EXISTS personal_email,
DROP COLUMN IF EXISTS home_address,
DROP COLUMN IF EXISTS health_notes,
DROP COLUMN IF EXISTS emergency_contact_name,
DROP COLUMN IF EXISTS emergency_contact_phone,
DROP COLUMN IF EXISTS sensitive_notes,
DROP COLUMN IF EXISTS national_id;