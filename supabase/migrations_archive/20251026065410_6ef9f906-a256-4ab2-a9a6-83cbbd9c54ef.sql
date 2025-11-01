-- Fix mutable search_path in create_default_staff_form_templates function
-- This prevents search path injection attacks

CREATE OR REPLACE FUNCTION public.create_default_staff_form_templates(p_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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