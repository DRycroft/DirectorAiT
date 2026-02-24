
-- Add onboarding_complete flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false;

-- Allow authenticated users to insert their own board_memberships (for invite acceptance)
CREATE POLICY "Users can insert their own memberships"
ON public.board_memberships
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
