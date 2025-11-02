# SECURITY-REMOVAL-REPORT

**Incident:** committed .env file(s) discovered.

**Immediate actions taken**
- Removed .env from repository working tree.
- Created .env.example and added .env to .gitignore.
- Added secret scanning workflow and docs.

**Required verification steps**
1. Rotate Supabase anon/service keys immediately and update deployment secrets.
2. Verify new keys in staging before production.
3. If necessary, purge .env from git history with git-filter-repo or BFG (see instructions below).

**Rotation record**
- New keys created: (timestamp / admin)
- Old keys revoked: (timestamp / admin)


- New SUPABASE_SERVICE_ROLE created: 2025-11-02 14:31 (Asia/Bangkok) — actor: Dave
- Old secret keys revoked: 2025-11-02 14:31 (Asia/Bangkok) — actor: Dave
- Deployment secrets updated (GitHub Actions, Vercel): 2025-11-02 14:31 (Asia/Bangkok) — actor: Dave
- Evidence: screenshot(s) uploaded to PR #8 (or attach in PR comment)
