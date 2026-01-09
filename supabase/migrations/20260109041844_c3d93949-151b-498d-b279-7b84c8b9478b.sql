-- Fix RLS policies with WITH CHECK (true)

-- 1. Fix organizations table INSERT policy
-- Currently allows ANY authenticated user to create organizations
-- Should only allow users who don't already have an org (first-time signup bootstrap)
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

CREATE POLICY "Authenticated users without org can create organizations" 
ON public.organizations 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Only allow creation if user doesn't already belong to an organization
  NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.org_id IS NOT NULL
  )
);

-- 2. Fix signon_responses table INSERT policy
-- Currently allows ANYONE to create signon responses
-- Should only allow authenticated users from the same org
DROP POLICY IF EXISTS "Anyone can create signon responses" ON public.signon_responses;

CREATE POLICY "Authenticated users can create signon responses" 
ON public.signon_responses 
FOR INSERT 
TO authenticated
WITH CHECK (
  -- User must belong to the same org as the signon response
  org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid())
);