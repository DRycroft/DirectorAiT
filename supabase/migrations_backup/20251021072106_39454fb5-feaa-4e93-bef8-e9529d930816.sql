-- Create board paper templates table for custom templates
CREATE TABLE IF NOT EXISTS public.board_paper_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL,
  company_name TEXT,
  logo_url TEXT,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(org_id, template_name, template_type)
);

ALTER TABLE public.board_paper_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org templates"
ON public.board_paper_templates
FOR SELECT
USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert templates"
ON public.board_paper_templates
FOR INSERT
WITH CHECK (
  org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  AND created_by = auth.uid()
);

CREATE POLICY "Users can update their org templates"
ON public.board_paper_templates
FOR UPDATE
USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their org templates"
ON public.board_paper_templates
FOR DELETE
USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));

CREATE TRIGGER update_board_paper_templates_updated_at
BEFORE UPDATE ON public.board_paper_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create user_roles table for proper RBAC
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  board_id UUID REFERENCES public.boards(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role, org_id, board_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "System can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (true);

-- Function to assign default observer role to new users
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS assign_default_role_trigger ON public.profiles;

CREATE TRIGGER assign_default_role_trigger
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.assign_default_role();