-- Create table for staff form templates
CREATE TABLE public.staff_form_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  form_type TEXT NOT NULL CHECK (form_type IN ('board_members', 'executive_team', 'key_staff')),
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(org_id, form_type)
);

-- Enable RLS
ALTER TABLE public.staff_form_templates ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their org templates"
ON public.staff_form_templates
FOR SELECT
USING (org_id IN (
  SELECT org_id FROM profiles WHERE id = auth.uid()
));

CREATE POLICY "Admins can manage templates"
ON public.staff_form_templates
FOR ALL
USING (
  has_role(auth.uid(), 'org_admin'::app_role) OR 
  has_role(auth.uid(), 'chair'::app_role)
);

-- Create trigger for updated_at
CREATE TRIGGER update_staff_form_templates_updated_at
BEFORE UPDATE ON public.staff_form_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default templates for all three types
CREATE OR REPLACE FUNCTION create_default_staff_form_templates(p_org_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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
    {"id": "home_address", "label": "Home Address", "required": false, "enabled": true, "field_type": "textarea", "order": 5, "locked": false},
    {"id": "date_of_birth", "label": "Date of Birth", "required": false, "enabled": true, "field_type": "date", "order": 6, "locked": false},
    {"id": "public_social_links", "label": "LinkedIn Profile", "required": false, "enabled": true, "field_type": "url", "order": 7, "locked": false},
    {"id": "reports_responsible_for", "label": "Reports Responsible For", "required": false, "enabled": true, "field_type": "textarea", "order": 8, "locked": false},
    {"id": "reports_to", "label": "Reports To", "required": false, "enabled": true, "field_type": "select", "order": 9, "locked": false},
    {"id": "professional_qualifications", "label": "Qualifications", "required": false, "enabled": true, "field_type": "textarea", "order": 10, "locked": false},
    {"id": "conflicts_of_interest", "label": "Conflicts of Interest", "required": false, "enabled": true, "field_type": "textarea", "order": 11, "locked": false},
    {"id": "personal_interests", "label": "Personal Interests/Hobbies", "required": false, "enabled": true, "field_type": "textarea", "order": 12, "locked": false},
    {"id": "health_notes", "label": "Health Issues", "required": false, "enabled": true, "field_type": "textarea", "order": 13, "locked": false},
    {"id": "emergency_contact_name", "label": "Emergency Contact Name", "required": false, "enabled": true, "field_type": "text", "order": 14, "locked": false},
    {"id": "emergency_contact_phone", "label": "Emergency Contact Phone", "required": false, "enabled": true, "field_type": "phone", "order": 15, "locked": false}
  ]'::jsonb)
  ON CONFLICT (org_id, form_type) DO NOTHING;

  -- Executive Team template
  INSERT INTO public.staff_form_templates (org_id, form_type, fields)
  VALUES (p_org_id, 'executive_team', '[
    {"id": "full_name", "label": "Full Name", "required": true, "enabled": true, "field_type": "text", "order": 0, "locked": true},
    {"id": "preferred_title", "label": "Preferred Title", "required": true, "enabled": true, "field_type": "text", "order": 1, "locked": true},
    {"id": "personal_email", "label": "Email Address", "required": true, "enabled": true, "field_type": "email", "order": 2, "locked": true},
    {"id": "personal_mobile", "label": "Phone Number", "required": true, "enabled": true, "field_type": "phone", "order": 3, "locked": true},
    {"id": "position", "label": "Position Held", "required": true, "enabled": true, "field_type": "text", "order": 4, "locked": true},
    {"id": "home_address", "label": "Home Address", "required": false, "enabled": true, "field_type": "textarea", "order": 5, "locked": false},
    {"id": "date_of_birth", "label": "Date of Birth", "required": false, "enabled": true, "field_type": "date", "order": 6, "locked": false},
    {"id": "public_social_links", "label": "LinkedIn Profile", "required": false, "enabled": true, "field_type": "url", "order": 7, "locked": false},
    {"id": "reports_responsible_for", "label": "Reports Responsible For", "required": false, "enabled": true, "field_type": "textarea", "order": 8, "locked": false},
    {"id": "reports_to", "label": "Reports To", "required": false, "enabled": true, "field_type": "select", "order": 9, "locked": false},
    {"id": "professional_qualifications", "label": "Qualifications", "required": false, "enabled": true, "field_type": "textarea", "order": 10, "locked": false},
    {"id": "conflicts_of_interest", "label": "Conflicts of Interest", "required": false, "enabled": true, "field_type": "textarea", "order": 11, "locked": false},
    {"id": "personal_interests", "label": "Personal Interests/Hobbies", "required": false, "enabled": true, "field_type": "textarea", "order": 12, "locked": false},
    {"id": "health_notes", "label": "Health Issues", "required": false, "enabled": true, "field_type": "textarea", "order": 13, "locked": false},
    {"id": "emergency_contact_name", "label": "Emergency Contact Name", "required": false, "enabled": true, "field_type": "text", "order": 14, "locked": false},
    {"id": "emergency_contact_phone", "label": "Emergency Contact Phone", "required": false, "enabled": true, "field_type": "phone", "order": 15, "locked": false}
  ]'::jsonb)
  ON CONFLICT (org_id, form_type) DO NOTHING;

  -- Key Staff template
  INSERT INTO public.staff_form_templates (org_id, form_type, fields)
  VALUES (p_org_id, 'key_staff', '[
    {"id": "full_name", "label": "Full Name", "required": true, "enabled": true, "field_type": "text", "order": 0, "locked": true},
    {"id": "preferred_title", "label": "Preferred Title", "required": true, "enabled": true, "field_type": "text", "order": 1, "locked": true},
    {"id": "personal_email", "label": "Email Address", "required": true, "enabled": true, "field_type": "email", "order": 2, "locked": true},
    {"id": "personal_mobile", "label": "Phone Number", "required": true, "enabled": true, "field_type": "phone", "order": 3, "locked": true},
    {"id": "position", "label": "Position Held", "required": true, "enabled": true, "field_type": "text", "order": 4, "locked": true},
    {"id": "home_address", "label": "Home Address", "required": false, "enabled": true, "field_type": "textarea", "order": 5, "locked": false},
    {"id": "date_of_birth", "label": "Date of Birth", "required": false, "enabled": true, "field_type": "date", "order": 6, "locked": false},
    {"id": "public_social_links", "label": "LinkedIn Profile", "required": false, "enabled": true, "field_type": "url", "order": 7, "locked": false},
    {"id": "reports_responsible_for", "label": "Reports Responsible For", "required": false, "enabled": true, "field_type": "textarea", "order": 8, "locked": false},
    {"id": "reports_to", "label": "Reports To", "required": false, "enabled": true, "field_type": "select", "order": 9, "locked": false},
    {"id": "professional_qualifications", "label": "Qualifications", "required": false, "enabled": true, "field_type": "textarea", "order": 10, "locked": false},
    {"id": "conflicts_of_interest", "label": "Conflicts of Interest", "required": false, "enabled": true, "field_type": "textarea", "order": 11, "locked": false},
    {"id": "personal_interests", "label": "Personal Interests/Hobbies", "required": false, "enabled": true, "field_type": "textarea", "order": 12, "locked": false},
    {"id": "health_notes", "label": "Health Issues", "required": false, "enabled": true, "field_type": "textarea", "order": 13, "locked": false},
    {"id": "emergency_contact_name", "label": "Emergency Contact Name", "required": false, "enabled": true, "field_type": "text", "order": 14, "locked": false},
    {"id": "emergency_contact_phone", "label": "Emergency Contact Phone", "required": false, "enabled": true, "field_type": "phone", "order": 15, "locked": false}
  ]'::jsonb)
  ON CONFLICT (org_id, form_type) DO NOTHING;
END;
$$;