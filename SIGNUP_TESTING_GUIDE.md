# Signup & Authentication Testing Guide

## Issues Fixed

### 1. **Password Rejection (422 Error)**
**Problem**: Supabase checks all passwords against the HaveIBeenPwned database and rejects compromised passwords.

**Solution**: 
- Increased minimum password length to 10 characters
- Added requirement for special characters
- Added validation against common patterns
- Improved error messages to clearly explain rejection reasons

### 2. **Unclear Error Messages**
**Problem**: Users weren't seeing clear feedback when signup failed.

**Solution**: 
- Enhanced error handling with specific messages for:
  - Passwords found in data breaches
  - Email already registered
  - Weak passwords
  - Invalid email formats
  - Generic 422 errors
- Added actionable guidance in error messages

### 3. **Email Confirmation Delays**
**Problem**: Email confirmation was required, slowing down testing.

**Solution**: 
- Enabled auto-confirm for emails (no verification needed during testing)

## Testing Instructions

### Creating Strong Test Passwords

✅ **GOOD PASSWORD EXAMPLES** (will pass validation):
- `BlueElephant$89Mountain!`
- `Coffee@Table#2024Sky`
- `RandomWord$123!Unique`
- `Testing@2024#StrongPass`
- `MyApp$SecurePass99!`

❌ **BAD PASSWORD EXAMPLES** (will be rejected):
- `Password123!` (too common)
- `Admin@2024` (too common)
- `qwerty123!` (too common)
- `Test1234!` (too common)
- Any password you've used on other sites

### Password Requirements

Your password MUST:
1. Be at least **10 characters** long
2. Contain **uppercase letters** (A-Z)
3. Contain **lowercase letters** (a-z)
4. Contain **numbers** (0-9)
5. Contain **special characters** (!@#$%^&*(),.?":{}|<>)
6. **NOT be found in data breaches** (checked automatically)
7. **NOT be a common pattern** (123, abc, qwe, password, admin, etc.)

### Step-by-Step Testing

1. **Navigate to Signup**
   - Go to `/signup`
   - Verify the form loads correctly

2. **Step 1: User Details**
   - Enter full name: `Test User`
   - Enter email: `test.user.{random}@example.com` (use random number to avoid duplicates)
   - Enter phone (optional)
   - Enter a **strong, unique password** (see examples above)
   - The password strength indicator should show "Good" or "Strong"
   - Click "Next"

3. **Step 2: Company Details**
   - Enter company name: `Test Company Ltd`
   - Enter business number (optional): `12345678`
   - Click "Next"

4. **Step 3: Contact Details**
   - Primary Contact:
     - Name: `John Smith`
     - Role: `CEO`
     - Email: `john@example.com`
     - Phone (optional)
   - Admin Person:
     - Name: `Jane Doe`
     - Role: `Administrator`
     - Email: `jane@example.com`
     - Phone (optional)
   - Click "Next"

4. **Step 4: Reporting Preferences**
   - Select reporting frequency: `Quarterly`
   - Enter financial year end (optional)
   - Enter AGM date (optional)
   - Click "Create Account"

5. **Success**
   - You should see "Account created successfully!"
   - You'll be redirected to `/dashboard`
   - No email confirmation required

### Common Issues & Solutions

#### Issue: "Password Rejected" / 422 Error
**Cause**: Password found in data breaches or too common

**Solutions**:
1. Use a completely unique password you've never used before
2. Use the password generator examples above
3. Combine 3-4 random words with numbers and symbols
4. Avoid common words like "password", "admin", "test"

#### Issue: "Email already registered"
**Cause**: Email is already in the database

**Solutions**:
1. Use the sign in page instead: `/auth`
2. Use a different email address
3. Add a number suffix: `test.user.{timestamp}@example.com`

#### Issue: Form validation errors
**Cause**: Missing required fields or invalid format

**Solutions**:
1. Check all required fields are filled (marked with red border)
2. Ensure email format is valid
3. Check phone number format if provided
4. Review password requirements

### Testing with E2E Tests

Run the E2E tests:
```bash
npm run test:e2e
```

The tests verify:
- Page loads correctly
- Form validation works
- Navigation between steps works
- Password strength indicator appears
- Error messages display properly

### Debugging Tips

1. **Open Browser Console** (F12)
   - All signup steps are logged with ✅ or ❌ markers
   - Look for error messages in the console

2. **Check Network Tab**
   - Look for failed requests to `/auth/v1/signup`
   - Check response for detailed error messages

3. **Common Console Messages**:
   - `✅ User created` - Auth user created successfully
   - `✅ Organization created` - Organization record created
   - `✅ Profile updated` - User profile updated with org_id
   - `✅ Role assigned` - org_admin role assigned
   - `❌ Auth error` - Authentication failed (check error message)

### Authentication Backend Configuration

- **Auto-confirm emails**: ✅ Enabled (no email verification needed)
- **Anonymous users**: ❌ Disabled
- **Signups**: ✅ Enabled
- **Password requirements**: Enforced by Supabase Auth

### Production Considerations

⚠️ Before deploying to production:
1. Consider disabling auto-confirm emails
2. Set up proper email templates
3. Configure email service (e.g., SendGrid, AWS SES)
4. Review password policies
5. Enable MFA for admin users
6. Review RLS policies
7. Test recovery flows

## Need Help?

If you continue to experience issues:
1. Check the browser console for detailed errors
2. Try using a completely random password generator
3. Use a different email address
4. Clear browser cache and try again
5. Check that JavaScript is enabled
