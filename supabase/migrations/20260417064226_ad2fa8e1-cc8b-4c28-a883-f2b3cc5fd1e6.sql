-- Lock down invite secrets on public.board_members.
-- These columns must not be readable by co-board members; access via
-- admin-gated RPCs (get_member_invite_email, invite_token_exists) only.
-- INSERT/UPDATE remain permitted by existing row-level policies.

REVOKE SELECT (invite_token)       ON public.board_members FROM anon, authenticated;
REVOKE SELECT (invite_email)       ON public.board_members FROM anon, authenticated;
REVOKE SELECT (invite_expires_at)  ON public.board_members FROM anon, authenticated;