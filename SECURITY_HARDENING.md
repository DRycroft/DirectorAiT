# Security Hardening Guide - Board Spark AI

## ⚠️ CRITICAL: Storage Bucket RLS Policies

### Status: **MANUAL ACTION REQUIRED**

Storage buckets lack RLS policies, creating a **HIGH SEVERITY** cross-organization data exposure vulnerability.

### Impact
- Any authenticated user can potentially access files from ANY organization
- Multi-tenant isolation is completely broken for file storage
- Confidential board documents, executive reports, and meeting minutes are exposed

### Why This Happened
Storage policies cannot be created via SQL migrations because `storage.objects` is managed by Supabase platform. Migration attempts return "must be owner of table objects" errors.

---

## Immediate Fix Steps

### 1. Apply Storage Bucket RLS Policies

**Location:** Lovable Cloud Backend → Storage → Policies

For **EACH** bucket (`board-documents`, `executive-reports`, `meeting-minutes`, `special-papers`), create four policies:

#### SELECT Policy (View Files)
```sql
-- Name: Users can view files in their org folder
-- Action: SELECT
-- Expression:
(
  bucket_id = 'board-documents' /* change per bucket */
) AND
(
  (storage.foldername(name))[1] = (
    SELECT org_id::text
    FROM public.profiles
    WHERE id = auth.uid()
  )
)
```

#### INSERT Policy (Upload Files)
```sql
-- Name: Users can upload to their org folder
-- Action: INSERT
-- Expression:
(
  bucket_id = 'board-documents'
) AND
(
  (storage.foldername(new.name))[1] = (
    SELECT org_id::text
    FROM public.profiles
    WHERE id = auth.uid()
  )
)
```

#### UPDATE Policy (Modify Files)
```sql
-- Name: Users can update their own files
-- Action: UPDATE
-- Expression:
bucket_id = 'board-documents' AND owner_id = auth.uid()
```

#### DELETE Policy (Remove Files)
```sql
-- Name: Users can delete their own files
-- Action: DELETE
-- Expression:
bucket_id = 'board-documents' AND owner_id = auth.uid()
```

**Repeat for all four buckets**, replacing `'board-documents'` with the appropriate bucket name.

---

### 2. Verify Storage Policies

**Test with two organization accounts:**

```javascript
// Test A: Upload as User A (Org A)
import { createClient } from '@supabase/supabase-js'
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

await sb.auth.setSession({ access_token: 'USER_A_TOKEN' })

const { data, error } = await sb.storage
  .from('board-documents')
  .upload(`${ORG_A_ID}/test-file.txt`, 'test content', { upsert: true })
console.log('Upload result:', data, error)

// Test B: Attempt access as User B (Org B)
await sb.auth.setSession({ access_token: 'USER_B_TOKEN' })

const { data: listData, error: listError } = await sb.storage
  .from('board-documents')
  .list(`${ORG_A_ID}`)

console.log('Should be denied or empty:', listData, listError)
```

**Expected Result:** User B should receive no items or an authorization error.

---

### 3. Rotate Supabase Keys

If `.env` was ever committed or keys were exposed:

1. **Open Lovable Cloud Backend → Settings → API**
2. **Rotate both keys:**
   - Anon key
   - Service role key (CRITICAL if exposed)
3. **Update Vercel Environment Variables:**
   - `VITE_SUPABASE_URL` (usually unchanged)
   - `VITE_SUPABASE_PUBLISHABLE_KEY` (new anon key)
   - `VITE_SUPABASE_SERVICE_ROLE_KEY` (server-side only - NEVER in client)
4. **Redeploy application**

---

### 4. Secret Management Best Practices

#### Never Commit Secrets
- ✅ `.env` is now in `.gitignore`
- ✅ `.env.example` contains safe placeholders only
- ❌ Never commit real keys to `.env.example`

#### Where to Store Secrets

| Environment | Storage Location |
|-------------|------------------|
| **Production** | Vercel → Project Settings → Environment Variables |
| **Lovable Cloud** | Project Settings → Secrets |
| **Local Development** | Copy `.env.example` to `.env` (gitignored) |
| **CI/CD** | GitHub Actions → Repository Secrets |

#### Secret Rotation Schedule
- **Immediate:** If exposed in repo history or logs
- **Quarterly:** As part of regular security maintenance
- **After team changes:** When admins leave the project

---

### 5. Edge Function Security Checklist

All edge functions should:
- ✅ Verify `Authorization` header
- ✅ Use service_role key only in server context
- ✅ Validate all inputs with Zod schemas
- ✅ Check user's organization before data access
- ✅ Return generic error messages (no stack traces)
- ✅ Require `CRON_SECRET` for scheduled tasks (no defaults)

---

### 6. Audit Checklist

Before production deployment:

- [ ] Storage RLS policies configured for all 4 buckets
- [ ] Two-org isolation test passed (attach logs to PR)
- [ ] Supabase keys rotated and Vercel secrets updated
- [ ] No `service_role` referenced in `src/` or client code
- [ ] Secret scan completed (`git grep -nE "AKIA|AIza|SENTRY|service_role"`)
- [ ] CI passes (lint, test, build)
- [ ] DEPLOY.md updated with security procedures
- [ ] Security team reviewed and approved

---

### 7. Testing Scripts

#### Secret Scan
```bash
# Quick grep for exposed secrets
git grep -nE "AKIA|AIza|SENTRY|SUPABASE|service_role|PRIVATE_KEY|-----BEGIN" || echo "✓ No secrets found"

# Check for service_role in client code
git grep -n "service_role" src/ || echo "✓ No service_role in client code"

# NPM audit
npm audit --json > audit.json
```

#### Storage Policy Test
```bash
# Run in staging environment
node scripts/test-storage-isolation.js
```

---

### 8. Rollback Plan

If policies cause issues:

1. **Code Rollback:**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

2. **Storage Policy Rollback:**
   - Open Lovable Cloud Backend → Storage → Policies
   - Delete problematic policies
   - Restore previous policy text (keep backup)

3. **Key Rollback:**
   - Keys cannot be "rolled back" once rotated
   - Update environment variables to new keys
   - Old keys are invalidated permanently

---

## Monitoring & Ongoing Security

### Daily
- Monitor Vercel deployment logs for auth errors
- Check error tracking for RLS policy violations

### Weekly
- Review storage access patterns in audit logs
- Scan for new dependencies with known vulnerabilities (`npm audit`)

### Monthly
- Review user roles and permissions
- Check for inactive accounts
- Review storage bucket contents for anomalies

### Quarterly
- Rotate Supabase keys
- Full security audit
- Review and update RLS policies

---

## Additional Security Features

### Already Implemented ✅
- Row-Level Security (RLS) on all 42 tables
- Role-based access control (RBAC) via `user_roles` table
- Security-definer functions prevent RLS recursion
- Multi-tenant isolation via `org_id` checks
- Input validation with Zod schemas
- Audit logging for all critical actions
- Generic error messages prevent information disclosure

### Recommended Enhancements
- [ ] Enable leaked password protection in auth settings
- [ ] Implement rate limiting on auth endpoints
- [ ] Add IP allowlisting for admin operations
- [ ] Set up automated security scanning (Snyk, Dependabot)
- [ ] Implement session timeout warnings
- [ ] Add CAPTCHA on public forms

---

## Support & Resources

- **Lovable Security Docs:** https://docs.lovable.dev/features/security
- **Supabase Security Best Practices:** https://supabase.com/docs/guides/security
- **OWASP Top 10:** https://owasp.org/www-project-top-ten/

---

**Last Updated:** 2025-11-02  
**Next Review:** 2025-12-02  
**Security Contact:** [Your Security Team Email]
