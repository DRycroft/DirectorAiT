-- Create enum for compliance frequency
CREATE TYPE public.compliance_frequency AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'semi_annual', 'annual', 'biennial', 'as_required');

-- Create enum for compliance status
CREATE TYPE public.compliance_status AS ENUM ('compliant', 'due_soon', 'overdue', 'not_applicable', 'in_progress');

-- Create compliance_categories table
CREATE TABLE public.compliance_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create compliance_items table
CREATE TABLE public.compliance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.compliance_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  authority TEXT,
  frequency public.compliance_frequency NOT NULL DEFAULT 'annual',
  next_due_date DATE,
  last_completed_date DATE,
  responsible_person TEXT,
  status public.compliance_status NOT NULL DEFAULT 'compliant',
  industry_sector TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  reminder_days_before INTEGER DEFAULT 30,
  notes TEXT,
  reference_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create compliance_reviews table
CREATE TABLE public.compliance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compliance_item_id UUID NOT NULL REFERENCES public.compliance_items(id) ON DELETE CASCADE,
  reviewed_by UUID NOT NULL REFERENCES public.profiles(id),
  review_date DATE NOT NULL,
  status public.compliance_status NOT NULL,
  notes TEXT,
  attachments JSONB DEFAULT '[]'::jsonb,
  signed_off_by UUID REFERENCES public.profiles(id),
  signed_off_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create compliance_templates table (for industry-specific defaults)
CREATE TABLE public.compliance_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_sector TEXT NOT NULL,
  category_id UUID REFERENCES public.compliance_categories(id),
  title TEXT NOT NULL,
  description TEXT,
  authority TEXT,
  frequency public.compliance_frequency NOT NULL,
  is_mandatory BOOLEAN NOT NULL DEFAULT true,
  reference_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.compliance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for compliance_categories
CREATE POLICY "Anyone can view compliance categories"
  ON public.compliance_categories FOR SELECT
  USING (true);

-- RLS Policies for compliance_items
CREATE POLICY "Users can view compliance items in their org"
  ON public.compliance_items FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create compliance items in their org"
  ON public.compliance_items FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update compliance items in their org"
  ON public.compliance_items FOR UPDATE
  USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can delete compliance items"
  ON public.compliance_items FOR DELETE
  USING (has_role(auth.uid(), 'org_admin'::app_role) OR has_role(auth.uid(), 'chair'::app_role));

-- RLS Policies for compliance_reviews
CREATE POLICY "Users can view compliance reviews in their org"
  ON public.compliance_reviews FOR SELECT
  USING (compliance_item_id IN (
    SELECT id FROM public.compliance_items 
    WHERE org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Users can create compliance reviews"
  ON public.compliance_reviews FOR INSERT
  WITH CHECK (reviewed_by = auth.uid());

CREATE POLICY "Users can update their own reviews"
  ON public.compliance_reviews FOR UPDATE
  USING (reviewed_by = auth.uid());

-- RLS Policies for compliance_templates
CREATE POLICY "Anyone can view compliance templates"
  ON public.compliance_templates FOR SELECT
  USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_compliance_items_updated_at
  BEFORE UPDATE ON public.compliance_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.compliance_categories (name, description, icon) VALUES
  ('Tax & Financial', 'Tax obligations, financial reporting, and audit requirements', 'DollarSign'),
  ('Health & Safety', 'Workplace health and safety regulations', 'Shield'),
  ('Environmental', 'Environmental regulations and sustainability requirements', 'Leaf'),
  ('Employment', 'Employment law and workplace relations', 'Users'),
  ('Data & Privacy', 'Data protection and privacy regulations', 'Lock'),
  ('Industry Specific', 'Industry-specific regulations and certifications', 'Building'),
  ('Corporate Governance', 'Corporate governance and reporting requirements', 'FileText'),
  ('Insurance', 'Insurance policies and coverage requirements', 'Umbrella');

-- Insert some NZ-specific compliance templates
INSERT INTO public.compliance_templates (industry_sector, title, description, authority, frequency, is_mandatory, category_id) VALUES
  ('all', 'GST Returns', 'Goods and Services Tax returns to be filed with IRD', 'Inland Revenue', 'monthly', true, (SELECT id FROM public.compliance_categories WHERE name = 'Tax & Financial')),
  ('all', 'PAYE Returns', 'Pay As You Earn tax deductions for employees', 'Inland Revenue', 'monthly', true, (SELECT id FROM public.compliance_categories WHERE name = 'Tax & Financial')),
  ('all', 'Provisional Tax', 'Provisional tax payments for income tax', 'Inland Revenue', 'quarterly', true, (SELECT id FROM public.compliance_categories WHERE name = 'Tax & Financial')),
  ('all', 'Annual Financial Statements', 'Preparation and filing of annual financial statements', 'Companies Office', 'annual', true, (SELECT id FROM public.compliance_categories WHERE name = 'Tax & Financial')),
  ('all', 'Annual Return', 'Annual return to Companies Office', 'Companies Office', 'annual', true, (SELECT id FROM public.compliance_categories WHERE name = 'Corporate Governance')),
  ('food_service', 'Food Safety Inspection', 'Health and safety inspection for food premises', 'Local Council', 'annual', true, (SELECT id FROM public.compliance_categories WHERE name = 'Health & Safety')),
  ('food_service', 'Food Control Plan', 'Maintain and review food control plan', 'MPI', 'annual', true, (SELECT id FROM public.compliance_categories WHERE name = 'Health & Safety')),
  ('all', 'Health & Safety Policy Review', 'Review and update health and safety policies', 'WorkSafe NZ', 'annual', true, (SELECT id FROM public.compliance_categories WHERE name = 'Health & Safety')),
  ('all', 'Privacy Policy Review', 'Review privacy policy compliance', 'Privacy Commissioner', 'annual', true, (SELECT id FROM public.compliance_categories WHERE name = 'Data & Privacy'));

-- Create function to calculate next due date
CREATE OR REPLACE FUNCTION public.calculate_next_due_date(
  last_date DATE,
  freq public.compliance_frequency
)
RETURNS DATE
LANGUAGE plpgsql
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