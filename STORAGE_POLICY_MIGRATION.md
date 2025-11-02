# Storage Policy Migration Guide

## ⚠️ CRITICAL: Org-Based Isolation Required

**Current Status:** Storage buckets have RLS policies but lack proper organization-based isolation.  
**Impact:** Any authenticated user can access files from other organizations.  
**Action Required:** Replace policies via Lovable Cloud dashboard.

---

## Manual Dashboard Steps

### Prerequisites

1. Open Lovable Cloud backend: <lov-open-backend>View Backend</lov-open-backend>
2. Navigate to **Storage → Policies**
3. Have these credentials ready for testing (ask David if needed):
   - User A: `usera@orga.com` (Org A)
   - User B: `userb@orgb.com` (Org B)

---

## For Each Bucket (Do All 4)

Apply these steps to:
- `board-documents`
- `executive-reports`
- `meeting-minutes`
- `special-papers`

---

### Step 1: Delete Insecure Policies

For the current bucket, **DELETE** these existing policies:

**❌ Delete:**
- `Users can upload documents to their org` (board-documents INSERT)
- `Users can view documents in their org` (board-documents SELECT)
- `Users can upload reports to their org folder` (executive-reports INSERT)
- `Users can view reports in their org` (executive-reports SELECT)
- `Users can upload minutes to their org folder` (meeting-minutes INSERT)
- `Users can view minutes in their org` (meeting-minutes SELECT)
- `Users can upload special papers to their org folder` (special-papers INSERT)
- `Users can view special papers in their org` (special-papers SELECT)

**✅ Keep (already properly scoped):**
- All DELETE policies (scoped by owner_id or user foldername)

---

### Step 2: Create Secure SELECT Policy

Click **New Policy** → Manual configuration

**Policy Name:** `Users can view files in their org folder`

**Allowed Operations:** `SELECT` ✓

**Target Roles:** Leave as `public` (authenticated users)

**Policy Definition (USING):**
```sql
(
  bucket_id = 'BUCKET_NAME_HERE'
) AND (
  (storage.foldername(name))[1] = (
    SELECT org_id::text 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
)
```

**Replace `BUCKET_NAME_HERE` with:** `board-documents`, `executive-reports`, etc.

---

### Step 3: Create Secure INSERT Policy

Click **New Policy** → Manual configuration

**Policy Name:** `Users can upload to their org folder`

**Allowed Operations:** `INSERT` ✓

**Target Roles:** Leave as `public` (authenticated users)

**Policy Definition (WITH CHECK):**
```sql
(
  bucket_id = 'BUCKET_NAME_HERE'
) AND (
  (storage.foldername(name))[1] = (
    SELECT org_id::text 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
)
```

**Replace `BUCKET_NAME_HERE` with:** `board-documents`, `executive-reports`, etc.

---

### Step 4: Create Secure UPDATE Policy

Click **New Policy** → Manual configuration

**Policy Name:** `Users can update their own uploads`

**Allowed Operations:** `UPDATE` ✓

**Target Roles:** Leave as `public` (authenticated users)

**Policy Definition (USING):**
```sql
bucket_id = 'BUCKET_NAME_HERE' AND owner_id = auth.uid()
```

---

### Step 5: Create Secure DELETE Policy

**If a properly scoped DELETE policy already exists, SKIP this step.**

Otherwise, click **New Policy** → Manual configuration

**Policy Name:** `Users can delete their own uploads`

**Allowed Operations:** `DELETE` ✓

**Target Roles:** Leave as `public` (authenticated users)

**Policy Definition (USING):**
```sql
bucket_id = 'BUCKET_NAME_HERE' AND owner_id = auth.uid()
```

---

### Step 6: Verify Policies for This Bucket

After creating policies, the Policies list should show:

```
Bucket: board-documents
  ✓ Users can view files in their org folder (SELECT)
  ✓ Users can upload to their org folder (INSERT)
  ✓ Users can update their own uploads (UPDATE)
  ✓ Users can delete their own uploads (DELETE)
```

**Screenshot this list** and save as `policies-BUCKETNAME.png`

---

### Step 7: Repeat for Next Bucket

Go back to **Step 1** and repeat for the next bucket:
- board-documents → executive-reports → meeting-minutes → special-papers

---

## Testing After Migration

### Run Isolation Test

```bash
cd /path/to/repo
npm install @supabase/supabase-js  # if not already installed

SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_ANON_KEY=your-anon-key \
node tools/test-storage-isolation.js
```

### Expected Output

```
=== Storage Isolation Test ===

1. Signing in User A...
✓ User A authenticated
✓ User A org_id: 12345678-1234-1234-1234-123456789012

2. User A uploading test file...
✓ Upload successful: 12345678-1234-1234-1234-123456789012/isolation-test-1234567890.txt

3. Signing in User B (different org)...
✓ User B authenticated (org_id: 87654321-4321-4321-4321-210987654321)

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

**Exit code 0** = All tests passed ✅  
**Exit code 1** = Isolation failed ❌  
**Exit code 2** = Test script error ⚠️

---

## Rollback Plan

If policies break legitimate access:

1. **Immediate:** Re-enable old policies via dashboard
2. **Investigate:** Check `profiles.org_id` values (should not be NULL)
3. **Test:** Verify file paths use format `{org_id}/{filename}`
4. **Retry:** Apply policies again after fixing data issues

---

## Common Issues

### Issue: "Permission denied" for legitimate users

**Cause:** User's `org_id` in `profiles` table is NULL or doesn't match folder structure.

**Fix:**
```sql
-- Check user org_id
SELECT id, email, org_id FROM profiles WHERE email = 'user@example.com';

-- If NULL, assign to an organization
UPDATE profiles SET org_id = 'org-uuid-here' WHERE id = 'user-uuid-here';
```

### Issue: Files uploaded before migration not accessible

**Cause:** Files are in wrong folder structure (not `{org_id}/filename`).

**Fix:** Files must be re-uploaded with correct folder structure, or use a migration script to move files.

---

## Verification Checklist

Before closing this task:

- [ ] All 4 buckets have SELECT, INSERT, UPDATE, DELETE policies
- [ ] All policies include `org_id` filtering (except owner_id-based)
- [ ] Screenshots saved for each bucket (4 total)
- [ ] `test-storage-isolation.js` passes (exit code 0)
- [ ] Test output pasted in PR
- [ ] No production files inaccessible (spot-check with real account)

---

## Additional Security Measures

After migration, consider:

1. **Audit existing files:** Ensure all files are in `{org_id}/` folder structure
2. **Update upload code:** Verify application code uses `{org_id}/filename` format
3. **Monitor logs:** Watch for 403 errors indicating policy issues
4. **Document:** Add folder structure requirement to developer docs

---

**Migration Date:** _____________  
**Performed By:** _____________  
**Verified By:** _____________  
**Sign-off:** _____________
