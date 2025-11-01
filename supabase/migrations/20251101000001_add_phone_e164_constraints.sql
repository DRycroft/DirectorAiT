-- Add E.164 format constraints for phone numbers
-- E.164 format: +[country code][subscriber number], max 15 digits total

-- Add check constraint for profiles table
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS profiles_phone_e164_format;

ALTER TABLE profiles 
  ADD CONSTRAINT profiles_phone_e164_format 
  CHECK (phone IS NULL OR phone ~ '^\+[1-9]\d{1,14}$');

-- Add check constraints for organizations table
ALTER TABLE organizations 
  DROP CONSTRAINT IF EXISTS org_phone_e164_format;

ALTER TABLE organizations 
  ADD CONSTRAINT org_phone_e164_format 
  CHECK (
    (company_phone IS NULL OR company_phone ~ '^\+[1-9]\d{1,14}$') AND
    (primary_contact_phone IS NULL OR primary_contact_phone ~ '^\+[1-9]\d{1,14}$') AND
    (admin_phone IS NULL OR admin_phone ~ '^\+[1-9]\d{1,14}$')
  );

-- Clean up existing phone numbers to E.164 format (remove spaces)
UPDATE profiles 
SET phone = regexp_replace(phone, '\s+', '', 'g')
WHERE phone IS NOT NULL AND phone ~ '\s';

UPDATE organizations 
SET 
  company_phone = regexp_replace(company_phone, '\s+', '', 'g'),
  primary_contact_phone = regexp_replace(primary_contact_phone, '\s+', '', 'g'),
  admin_phone = regexp_replace(admin_phone, '\s+', '', 'g')
WHERE (company_phone IS NOT NULL AND company_phone ~ '\s')
   OR (primary_contact_phone IS NOT NULL AND primary_contact_phone ~ '\s')
   OR (admin_phone IS NOT NULL AND admin_phone ~ '\s');

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT profiles_phone_e164_format ON profiles IS 
  'Ensures phone numbers follow E.164 international format: +[country code][number], max 15 digits';

COMMENT ON CONSTRAINT org_phone_e164_format ON organizations IS 
  'Ensures all organization phone numbers follow E.164 international format';
