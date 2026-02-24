-- Add invite_email column to board_members
ALTER TABLE public.board_members ADD COLUMN IF NOT EXISTS invite_email text;

-- Create trigger to auto-set invite_expires_at when invite_token is set
CREATE OR REPLACE FUNCTION public.set_invite_expiry()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- When invite_token is set (from null) or changed, set expiry to 7 days from now
  IF NEW.invite_token IS NOT NULL AND (OLD.invite_token IS NULL OR OLD.invite_token IS DISTINCT FROM NEW.invite_token) THEN
    NEW.invite_expires_at := now() + interval '7 days';
  END IF;
  -- When invite_token is cleared, clear the expiry too
  IF NEW.invite_token IS NULL AND OLD.invite_token IS NOT NULL THEN
    NEW.invite_expires_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_board_member_invite_expiry
  BEFORE INSERT OR UPDATE ON public.board_members
  FOR EACH ROW
  EXECUTE FUNCTION public.set_invite_expiry();