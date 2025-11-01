-- Fix RLS on roles metadata table
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read role metadata (for UI dropdowns, etc)
CREATE POLICY "Anyone can view role metadata" ON public.roles
  FOR SELECT USING (true);

-- Only super admins can modify role definitions
CREATE POLICY "Super admins can manage roles" ON public.roles
  FOR ALL USING (
    public.has_role(auth.uid(), 'super_admin'::app_role)
  );