-- Fix unrestricted organization creation vulnerability
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can insert organizations" ON organizations;

-- Create a more restrictive policy that only allows users without an org to create one
CREATE POLICY "Restrict org creation to users without org" ON organizations
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM profiles WHERE org_id IS NULL
  )
);