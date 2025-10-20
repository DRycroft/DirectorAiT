-- Fix search_path for generate_member_invite_token function
DROP FUNCTION IF EXISTS public.generate_member_invite_token();

CREATE OR REPLACE FUNCTION public.generate_member_invite_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64');
END;
$$;