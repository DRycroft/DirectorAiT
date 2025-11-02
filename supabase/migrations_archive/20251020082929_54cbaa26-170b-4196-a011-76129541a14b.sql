-- Fix 1: Create security definer function to get user's org_id without recursion
CREATE OR REPLACE FUNCTION public.get_user_org_id(user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.profiles WHERE id = user_id LIMIT 1;
$$;

-- Fix 2: Create security definer function to check board membership without recursion
CREATE OR REPLACE FUNCTION public.is_board_member(user_id uuid, board_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.board_memberships 
    WHERE user_id = is_board_member.user_id 
    AND board_id = is_board_member.board_id
  );
$$;

-- Fix 3: Drop ALL policies that depend on profiles.role column
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view documents in their org" ON public.archived_documents;
DROP POLICY IF EXISTS "Admins can view audit log" ON public.audit_log;
DROP POLICY IF EXISTS "Users can view board memberships" ON public.board_memberships;
DROP POLICY IF EXISTS "Board members can view memberships" ON public.board_memberships;

-- Fix 4: Migrate role data from profiles to user_roles (using correct enum values)
INSERT INTO public.user_roles (user_id, role)
SELECT id, role::app_role 
FROM public.profiles 
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Fix 5: Now drop the role column
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role CASCADE;

-- Fix 6: Create new RLS policies for profiles using security definer functions
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can view profiles in same org"
ON public.profiles
FOR SELECT
TO authenticated
USING (org_id = get_user_org_id(auth.uid()));

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Fix 7: Create new RLS policies for board_memberships
CREATE POLICY "Users can view own memberships"
ON public.board_memberships
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all memberships"
ON public.board_memberships
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin') 
  OR has_role(auth.uid(), 'org_admin')
);

-- Fix 8: Secure archived_documents using has_role
CREATE POLICY "Board members can view documents"
ON public.archived_documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.board_memberships
    WHERE board_memberships.user_id = auth.uid()
    AND board_memberships.board_id = archived_documents.board_id
  )
  OR has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'org_admin')
);

-- Fix 9: Secure audit_log using has_role
CREATE POLICY "Admins can view audit log"
ON public.audit_log
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin') 
  OR has_role(auth.uid(), 'org_admin')
);

-- Fix 10: Secure extracted_decisions
DROP POLICY IF EXISTS "Users can view decisions" ON public.extracted_decisions;

CREATE POLICY "Board members can view decisions"
ON public.extracted_decisions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.archived_documents ad
    JOIN public.board_memberships bm ON bm.board_id = ad.board_id
    WHERE ad.id = extracted_decisions.document_id
    AND bm.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'org_admin')
);