# DirectorAiT — Incident Runbook

## Quick Reference

| Priority | Response Time | Examples |
|----------|--------------|---------|
| P1 — Critical | < 1 hour | App down, data loss, auth broken |
| P2 — High | < 4 hours | Major feature broken, signup failing |
| P3 — Medium | < 1 business day | UI bug, minor feature issue |
| P4 — Low | Next sprint | Cosmetic, nice-to-have |

## Contacts

- **Support inbox:** support@aigentia.co.nz
- **General:** hello@aigentia.co.nz

## Common Incidents

### 1. App not loading / white screen
- Check Vercel deployment status at vercel.com dashboard
- Check browser console for JS errors
- Verify Supabase project is running (Lovable Cloud status)
- Roll back to previous deployment if needed

### 2. Users cannot sign in
- Check Supabase Auth service status
- Verify email confirmation flow is working
- Check for rate limiting on auth endpoints
- Review recent auth-related code changes

### 3. Data not saving / RLS errors
- Check browser network tab for 403/401 responses
- Verify user has correct org_id in profiles table
- Check RLS policies for the affected table
- Review recent migration changes

### 4. Email invitations not arriving
- Check Resend dashboard for delivery status
- Verify RESEND_API_KEY is set in edge function secrets
- Check edge function logs for errors
- Verify recipient email is not on suppression list

### 5. Edge function errors
- Check edge function logs via Lovable Cloud
- Verify all required secrets are configured
- Check for timeout issues (30s default limit)
- Review recent function code changes

## Incident Process

1. **Acknowledge** — Reply to reporter within response time
2. **Assess** — Determine priority and impact
3. **Investigate** — Check logs, reproduce if possible
4. **Fix or mitigate** — Apply fix or workaround
5. **Communicate** — Update affected users
6. **Post-mortem** — Document what happened and prevention steps

## Rollback

- **Code:** Revert to previous Vercel deployment via dashboard
- **Database:** Migrations cannot be auto-rolled back; prepare a reverse migration if needed
- **Edge functions:** Redeploy previous version from git history

## Monitoring

- Unhandled promise rejections logged globally (main.tsx)
- Web Vitals tracked in production (performance.ts)
- Supabase provides built-in query and auth metrics
- Vercel provides deployment and function logs
