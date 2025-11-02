# HANDOFF

Steps for ops / admins:
1. Rotate Supabase keys: Project → Settings → API → Create new keys.
2. Update deployment secrets (Vercel / Netlify / GitHub Secrets / Supabase Functions).
3. Revoke old keys.
4. Confirm secrets replaced in all environments.

