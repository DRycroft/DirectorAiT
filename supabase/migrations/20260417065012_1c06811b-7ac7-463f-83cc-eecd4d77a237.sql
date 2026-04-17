
-- 1. Unique index on token
CREATE UNIQUE INDEX IF NOT EXISTS document_invites_token_uidx
  ON public.document_invites(token);

-- 2. Public lookup RPC (narrow projection, no PII beyond what recipient needs)
CREATE OR REPLACE FUNCTION public.lookup_action_invite(_token text)
RETURNS TABLE(
  id uuid,
  invite_type text,
  target_type text,
  recipient_name text,
  recipient_email text,
  status text,
  expires_at timestamptz,
  completed_at timestamptz,
  effective_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    di.id,
    di.invite_type,
    di.target_type,
    di.recipient_name,
    di.recipient_email,
    di.status,
    di.expires_at,
    di.completed_at,
    CASE
      WHEN di.status = 'completed' THEN 'completed'
      WHEN di.expires_at IS NOT NULL AND di.expires_at <= now() THEN 'expired'
      ELSE 'pending'
    END AS effective_status
  FROM public.document_invites di
  WHERE di.token = _token
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_action_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_action_invite(text) TO anon, authenticated;

-- 3. Public submit RPC (transactional: insert response + complete invite + audit)
CREATE OR REPLACE FUNCTION public.submit_action_response(
  _token text,
  _payload jsonb,
  _respondent_name text DEFAULT NULL,
  _respondent_email text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite public.document_invites%ROWTYPE;
  _response_id uuid;
BEGIN
  IF _token IS NULL OR length(_token) < 16 THEN
    RAISE EXCEPTION 'Invalid token';
  END IF;

  IF _payload IS NULL OR jsonb_typeof(_payload) <> 'object' THEN
    RAISE EXCEPTION 'Invalid payload';
  END IF;

  -- Length guards (defence in depth)
  IF _respondent_name IS NOT NULL AND length(_respondent_name) > 200 THEN
    RAISE EXCEPTION 'Name too long';
  END IF;
  IF _respondent_email IS NOT NULL AND length(_respondent_email) > 255 THEN
    RAISE EXCEPTION 'Email too long';
  END IF;

  -- Lock the invite row
  SELECT * INTO _invite
  FROM public.document_invites
  WHERE token = _token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired link';
  END IF;

  IF _invite.status = 'completed' THEN
    RAISE EXCEPTION 'Action already completed';
  END IF;

  IF _invite.expires_at IS NOT NULL AND _invite.expires_at <= now() THEN
    RAISE EXCEPTION 'Invalid or expired link';
  END IF;

  -- Insert response
  INSERT INTO public.signon_responses (
    invite_id, org_id, payload, respondent_name, respondent_email
  ) VALUES (
    _invite.id,
    _invite.org_id,
    _payload,
    COALESCE(_respondent_name, _invite.recipient_name),
    COALESCE(lower(trim(_respondent_email)), _invite.recipient_email)
  )
  RETURNING id INTO _response_id;

  -- Mark invite completed
  UPDATE public.document_invites
  SET status = 'completed',
      completed_at = now(),
      updated_at = now()
  WHERE id = _invite.id;

  -- Audit (anonymous actor: actor_id NULL)
  INSERT INTO public.audit_log (
    entity_type, entity_id, actor_id, action, detail_json, timestamp
  ) VALUES (
    'document_invite',
    _invite.id,
    NULL,
    'invite_submitted',
    jsonb_build_object(
      'response_id', _response_id,
      'invite_type', _invite.invite_type,
      'target_type', _invite.target_type,
      'submitted_via', 'magic_link'
    ),
    now()
  );

  RETURN _response_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_action_response(text, jsonb, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_action_response(text, jsonb, text, text) TO anon, authenticated;
