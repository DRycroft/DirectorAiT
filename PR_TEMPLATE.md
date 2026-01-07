# PR: Storage Policy Security Fix & Isolation Testing

## 🔒 Summary

This PR addresses critical storage bucket policy weaknesses that allowed cross-organization data access. It includes:

1. **Documentation:** Detailed migration guide for replacing insecure storage policies
2. **Testing:** Two-org isolation test script
3. **Security:** Updated deployment documentation with key rotation procedures
4. **Hygiene:** Added .env.example with safe placeholders

## 🎯 Changes

### Code Artifacts Created

- ✅ `tools/test-storage-isolation.js` - Two-org isolation test
- ✅ `tools/package.json` - Dependencies for test script
- ✅ `STORAGE_POLICY_MIGRATION.md` - Step-by-step dashboard migration guide
- ✅ `DEPLOY.md` - Updated storage security section
- ✅ `.env.example` - Placeholder file for local development

### Manual Configuration Required (Dashboard)

⚠️ **These steps MUST be completed via Lovable Cloud dashboard before merging:**

1. Storage bucket policy replacement (4 buckets × 4 policies each)
2. Enable leaked password protection in Authentication settings
3. Run isolation test to verify org-based filtering

See `STORAGE_POLICY_MIGRATION.md` for detailed instructions.

---

## ✅ Verification Checklist

### Build & Tests

Paste outputs from:

```bash
npm ci
npm run lint
npm run test
npm run build  # paste last 30 lines
```

**Build Output (last 30 lines):**
```
[PASTE HERE]
```

**Test Summary:**
```
[PASTE HERE]
```

**Lint Output:**
```
[PASTE HERE]
```

---

### Storage Policy Migration

**Checklist:**
- [ ] All 4 buckets have policies replaced
- [ ] Screenshots attached for each bucket (4 total)
- [ ] All policies include org_id filtering

**Screenshots:**
- [ ] `policies-board-documents.png`
- [ ] `policies-executive-reports.png`
- [ ] `policies-meeting-minutes.png`
- [ ] `policies-special-papers.png`

Attach screenshots showing policy list for each bucket.

---

### Isolation Test Results

**Run command:**
```bash
cd tools
npm install
cd ..
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_ANON_KEY=your-anon-key \
node tools/test-storage-isolation.js
```

**Test Output:**
```
[PASTE FULL CONSOLE OUTPUT HERE]
```

**Expected:** Exit code 0 with both PASS messages (list denied, download denied)

---

### Leaked Password Protection

**Steps:**
1. Open Lovable Cloud → Authentication → Settings
2. Enable "Leaked Password Protection"
3. Test signup with `password123` - should be rejected

**Screenshot:**
```
[ATTACH: leaked-password-enabled.png]
[ATTACH: leaked-password-rejection.png]
```

---

### Secret Scan

**Command:**
```bash
git grep -nE "service_role|SENTRY_DSN|SUPABASE_ANON_KEY|PRIVATE_KEY|-----BEGIN" || echo "✓ No obvious keys in HEAD"
```

**Output:**
```
[PASTE HERE]
```

**Expected:** No secrets found (or only .env.example placeholders)

---

### .env Safety Check

**Command:**
```bash
git ls-files --others --ignored --exclude-standard | grep -E "^\.env$" || echo "✓ .env not committed"
git ls-files | grep -E "^\.env$" || echo "✓ .env not tracked"
```

**Output:**
```
[PASTE HERE]
```

**Expected:** `.env` not committed or tracked

---

### Git Commit History

**Command:**
```bash
git log --oneline -n 6
```

**Output:**
```
[PASTE HERE - should show commits from this branch]
```

---

## 🔐 Security Impact

### Before This PR

❌ **Critical Vulnerability:** Any authenticated user could:
- List files from ANY organization's folders
- Download confidential documents from other organizations
- Upload files to other organizations' folders

**Affected Buckets:**
- `board-documents` - NO org filtering on SELECT
- `executive-reports` - User exists check only (no org match)
- `meeting-minutes` - User exists check only (no org match)
- `special-papers` - User exists check only (no org match)

### After This PR

✅ **Secure Isolation:** Each user can only:
- View files in their own organization's folder
- Upload to their own organization's folder
- Update/delete their own uploads

**Enforcement:** `org_id` from user's profile must match folder name structure `{org_id}/filename`

---

## 📋 Post-Merge Actions

After merging and verifying in production:

- [ ] Run isolation test in production with real accounts
- [ ] Monitor Sentry/logs for 403 errors (indicates policy issues)
- [ ] Update team documentation with folder structure requirements
- [ ] Schedule quarterly security review

---

## 🚨 Important Notes

### Do NOT Merge Until:

1. ✅ All storage policies manually configured in dashboard
2. ✅ Isolation test passes (exit code 0)
3. ✅ Leaked password protection enabled and tested
4. ✅ David provides explicit merge approval

### Key Rotation

⚠️ **Do NOT rotate Supabase keys until:**
- Isolation test passes
- David provides explicit "GO AHEAD" in chat
- Follow rotation procedure in `DEPLOY.md` lines 117-154

---

## 🧪 Testing Instructions for Reviewers

1. **Review documentation:**
   - Read `STORAGE_POLICY_MIGRATION.md`
   - Verify steps are clear and complete

2. **Check code artifacts:**
   - Review `tools/test-storage-isolation.js` logic
   - Verify `.env.example` has no real secrets

3. **Verify checklist completion:**
   - All items marked complete above
   - Screenshots attached
   - Test output shows PASS

---

## 📝 Rollback Plan

If issues arise after merge:

1. **Immediate:** Revert PR via GitHub
2. **Storage:** Re-enable old policies via dashboard (backup policy text in migration doc)
3. **Verify:** Check `profiles.org_id` values (should not be NULL)
4. **Retry:** Fix data issues and re-apply policies

---

**Branch:** `fix/storage-policy-and-security`  
**Reviewer:** David  
**Status:** ⏸️ Awaiting approval - DO NOT MERGE

---

## 🏷️ Related Issues

Closes #[ISSUE_NUMBER] (if applicable)

Related to security hardening epic and storage isolation requirements.
