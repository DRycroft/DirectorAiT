-- Create table for sensitive board member data with restricted access
CREATE TABLE IF NOT EXISTS public.board_members_sensitive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.board_members(id) ON DELETE CASCADE,
  national_id TEXT,
  home_address TEXT,
  health_notes TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  sensitive_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(member_id)
);

-- Enable RLS on the sensitive data table
ALTER TABLE public.board_members_sensitive ENABLE ROW LEVEL SECURITY;

-- Only admins, chairs, or the member themselves can view sensitive data
CREATE POLICY "Only admins or self can view sensitive data"
  ON public.board_members_sensitive FOR SELECT
  USING (
    member_id IN (
      SELECT id FROM public.board_members WHERE user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'org_admin')
    OR has_role(auth.uid(), 'chair')
  );

-- Only admins or the member themselves can insert sensitive data
CREATE POLICY "Only admins or self can insert sensitive data"
  ON public.board_members_sensitive FOR INSERT
  WITH CHECK (
    member_id IN (
      SELECT id FROM public.board_members WHERE user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'org_admin')
    OR has_role(auth.uid(), 'chair')
  );

-- Only admins or the member themselves can update sensitive data
CREATE POLICY "Only admins or self can update sensitive data"
  ON public.board_members_sensitive FOR UPDATE
  USING (
    member_id IN (
      SELECT id FROM public.board_members WHERE user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'org_admin')
    OR has_role(auth.uid(), 'chair')
  );

-- Only admins can delete sensitive data
CREATE POLICY "Only admins can delete sensitive data"
  ON public.board_members_sensitive FOR DELETE
  USING (
    has_role(auth.uid(), 'org_admin')
    OR has_role(auth.uid(), 'chair')
  );

-- Add invite_expires_at column to board_members for token expiration
ALTER TABLE public.board_members ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMP WITH TIME ZONE;

-- Update the generate_member_invite_token function to use cryptographically secure random bytes
CREATE OR REPLACE FUNCTION public.generate_member_invite_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Generate 256-bit cryptographically secure random token
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$;

-- Create trigger to update updated_at on board_members_sensitive
CREATE TRIGGER update_board_members_sensitive_updated_at
  BEFORE UPDATE ON public.board_members_sensitive
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();