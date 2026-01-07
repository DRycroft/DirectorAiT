# Verification Checklist for Storage Security Fix

## Branch Information

**Branch Name:** `fix/storage-policy-and-security`  
**Base Branch:** `main` (or current integration branch)  
**Status:** Ready for review - DO NOT MERGE until all items checked

---

## ✅ Code Artifacts Verification

### Files Created/Modified

- [ ] `tools/test-storage-isolation.js` - Isolation test script created
- [ ] `tools/package.json` - Dependencies for test tools
- [ ] `STORAGE_POLICY_MIGRATION.md` - Detailed migration guide created
- [ ] `DEPLOY.md` - Storage security section updated (lines ~175-195)
- [ ] `.env.example` - Placeholder file exists with safe values
- [ ] `PR_TEMPLATE.md` - Comprehensive PR template created
- [ ] `VERIFICATION_CHECKLIST.md` - This file

### Git Safety Checks

Run these commands and paste results:

```bash
# 1. Check .env is not committed
git ls-files | grep -E "^\.env$" || echo "✓ .env not tracked"
git ls-files --others --ignored --exclude-standard | grep -E "^\.env$" || echo "✓ .env not committed"

# 2. Secret scan (should only find .env.example placeholders)
git grep -nE "service_role|SENTRY_DSN|SUPABASE_ANON_KEY|PRIVATE_KEY|-----BEGIN" || echo "✓ No obvious keys in HEAD"

# 3. Show commits on branch
git log --oneline -n 6
```

**Outputs:**
```
[PASTE HERE]
```

---

## 🔨 Build & Test Verification

### Commands to Run

```bash
# Install dependencies
npm ci

# Lint check
npm run lint

# Run tests
npm run test

# Build application
npm run build

# Get last 30 lines of build output
# (On macOS/Linux, you can use: npm run build 2>&1 | tail -n 30)
```

### Expected Results

- [ ] `npm ci` completes without errors
- [ ] `npm run lint` exits 0 (no lint errors)
- [ ] `npm run test` exits 0 (all tests pass)
- [ ] `npm run build` exits 0 (build succeeds)

**Build Output (last 30 lines):**
```
[PASTE HERE]
```

**Test Summary:**
```
[PASTE HERE]
```

---

## 🗄️ Storage Policy Configuration (Manual Dashboard Steps)

### Before Starting

- [ ] Open Lovable Cloud backend dashboard
- [ ] Navigate to Storage → Policies
- [ ] Have `STORAGE_POLICY_MIGRATION.md` open for reference

### For Each Bucket (Complete All 4)

#### Bucket 1: board-documents

- [ ] Deleted insecure SELECT policy: `Users can view documents in their org`
- [ ] Deleted insecure INSERT policy: `Users can upload documents to their org`
- [ ] Created secure SELECT policy with org_id filtering
- [ ] Created secure INSERT policy with org_id filtering
- [ ] Created secure UPDATE policy (owner_id scoped)
- [ ] Created secure DELETE policy (owner_id scoped)
- [ ] Screenshot saved: `policies-board-documents.png`

#### Bucket 2: executive-reports

- [ ] Deleted insecure SELECT policy: `Users can view reports in their org`
- [ ] Deleted insecure INSERT policy: `Users can upload reports to their org folder`
- [ ] Created secure SELECT policy with org_id filtering
- [ ] Created secure INSERT policy with org_id filtering
- [ ] Created secure UPDATE policy (owner_id scoped)
- [ ] Verified secure DELETE policy exists
- [ ] Screenshot saved: `policies-executive-reports.png`

#### Bucket 3: meeting-minutes

- [ ] Deleted insecure SELECT policy: `Users can view minutes in their org`
- [ ] Deleted insecure INSERT policy: `Users can upload minutes to their org folder`
- [ ] Created secure SELECT policy with org_id filtering
- [ ] Created secure INSERT policy with org_id filtering
- [ ] Created secure UPDATE policy (owner_id scoped)
- [ ] Verified secure DELETE policy exists
- [ ] Screenshot saved: `policies-meeting-minutes.png`

#### Bucket 4: special-papers

- [ ] Deleted insecure SELECT policy: `Users can view special papers in their org`
- [ ] Deleted insecure INSERT policy: `Users can upload special papers to their org folder`
- [ ] Created secure SELECT policy with org_id filtering
- [ ] Created secure INSERT policy with org_id filtering
- [ ] Created secure UPDATE policy (owner_id scoped)
- [ ] Verified secure DELETE policy exists
- [ ] Screenshot saved: `policies-special-papers.png`

### Policy Text Reference

Each bucket should have these 4 policies (adjust bucket_id for each):

**SELECT:**
```sql
(bucket_id = 'BUCKET_NAME') AND 
((storage.foldername(name))[1] = (SELECT org_id::text FROM public.profiles WHERE id = auth.uid()))
```

**INSERT:**
```sql
(bucket_id = 'BUCKET_NAME') AND 
((storage.foldername(name))[1] = (SELECT org_id::text FROM public.profiles WHERE id = auth.uid()))
```

**UPDATE:**
```sql
bucket_id = 'BUCKET_NAME' AND owner_id = auth.uid()
```

**DELETE:**
```sql
bucket_id = 'BUCKET_NAME' AND owner_id = auth.uid()
```

---

## 🧪 Isolation Test Execution

### Prerequisites

- [ ] Test accounts created in two different organizations:
  - User A: `usera@orga.com` / `TestPass123!` (Org A)
  - User B: `userb@orgb.com` / `TestPass123!` (Org B)
- [ ] Storage policies configured (all 4 buckets)
- [ ] Test script dependencies installed

### Run Test

```bash
cd tools
npm install  # Install @supabase/supabase-js
cd ..

SUPABASE_URL=https://lomksomekpysjgtnlguq.supabase.co \
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvbWtzb21la3B5c2pndG5sZ3VxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NjEyMDgsImV4cCI6MjA3NjMzNzIwOH0.xwRiW2B8X51puDJ3IxnwKWsUsv7jRHsAIJjd6Wkq-JA \
node tools/test-storage-isolation.js
```

### Expected Output

```
=== Storage Isolation Test ===

1. Signing in User A...
✓ User A authenticated
✓ User A org_id: [org-a-uuid]

2. User A uploading test file...
✓ Upload successful: [org-a-uuid]/isolation-test-[timestamp].txt

3. Signing in User B (different org)...
✓ User B authenticated (org_id: [org-b-uuid])

4. ISOLATION TEST: User B listing User A's folder...
List result:
  Data: null
  Error: { message: 'permission denied for table objects' }
✅ PASS: User B cannot list User A's files

5. ISOLATION TEST: User B downloading User A's file...
Download result:
  Success: false
  Error: { message: 'permission denied for table objects' }
✅ PASS: User B cannot download User A's file

6. Cleaning up test file...
✓ Cleanup complete

=== Test Complete ===
```

### Test Results

- [ ] Exit code: 0 (test passed)
- [ ] User A upload succeeded
- [ ] User B list attempt: PASS (denied or empty)
- [ ] User B download attempt: PASS (denied)

**Full Console Output:**
```
[PASTE HERE]
```

---

## 🔐 Authentication Security

### Leaked Password Protection

#### Enable Setting

- [ ] Opened Lovable Cloud → Authentication → Settings
- [ ] Enabled "Leaked Password Protection"
- [ ] Screenshot saved: `leaked-password-enabled.png`

#### Test Rejection

- [ ] Attempted signup with compromised password: `password123`
- [ ] System rejected with appropriate error message
- [ ] Screenshot saved: `leaked-password-rejection.png`

**Test Result:**
```
[PASTE ERROR MESSAGE HERE]
```

---

## 📝 Documentation Review

### Files to Review

- [ ] `STORAGE_POLICY_MIGRATION.md` - Clear, complete, actionable
- [ ] `DEPLOY.md` updates - Storage security section accurate
- [ ] `tools/test-storage-isolation.js` - Code logic correct
- [ ] `.env.example` - No real secrets, all placeholders
- [ ] `PR_TEMPLATE.md` - Comprehensive checklist

---

## 🚦 Pre-Merge Approval Checklist

### David's Sign-Off Required

- [ ] All build & test commands exit 0
- [ ] All 4 storage buckets have secure policies configured
- [ ] Screenshots attached for all 4 buckets (policies visible)
- [ ] Isolation test passes (exit code 0, both PASS results)
- [ ] Leaked password protection enabled and tested
- [ ] Secret scan shows no exposed keys (except .env.example placeholders)
- [ ] .env confirmed not committed to git
- [ ] Commit history clean (6 commits pasted)

### Additional Verification

- [ ] PR created on GitHub with `PR_TEMPLATE.md` content
- [ ] All verification outputs pasted in PR description
- [ ] No merge performed (awaiting David's approval)

---

## 🔄 Post-Approval Actions (After David Says "GO AHEAD")

### Key Rotation (Only After Approval)

- [ ] David provides explicit "GO AHEAD" for key rotation
- [ ] Follow `DEPLOY.md` lines 117-154 (Rotating Supabase Keys)
- [ ] Rotate service_role key first (server-side only)
- [ ] Update Lovable Cloud secrets
- [ ] Rotate anon key (client-side)
- [ ] Update Vercel environment variables
- [ ] Retain old keys for 1 hour max (emergency rollback)
- [ ] Test authentication flow in production
- [ ] Verify edge functions still work
- [ ] Permanently delete old keys after verification

### Production Verification

- [ ] Merge PR after David approval
- [ ] Run isolation test in production with real accounts
- [ ] Monitor logs for 403 errors (24 hours)
- [ ] Verify legitimate users can access their files
- [ ] Document completion in `SECURITY_HARDENING.md`

---

## ❌ Blockers & Issues

Document any issues encountered:

**Issue:** [Description]  
**Impact:** [Critical/High/Medium/Low]  
**Resolution:** [Steps taken or needed]  

**Examples:**
- `.gitignore` is read-only (cannot add .env) → Check if .env already gitignored
- Test accounts don't exist → Ask David for credentials
- Supabase dashboard access issue → Request permissions

---

## 📊 Final Status Summary

**Date Completed:** __________  
**Completed By:** __________  
**Verified By:** David  

**Overall Status:**
- [ ] ✅ All items checked - Ready for David's approval
- [ ] ⏸️ Blocked - Issues listed above need resolution
- [ ] ❌ Failed - Critical issues prevent completion

**David's Approval:**
- [ ] ✅ APPROVED - Proceed with merge
- [ ] 🔄 CHANGES REQUESTED - See comments
- [ ] ❌ REJECTED - Do not merge

---

**Notes:**
```
[Any additional comments or observations]
```
