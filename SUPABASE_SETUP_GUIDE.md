# Supabase Setup Guide for Board Spark AI

## Overview
This guide walks you through setting up the Supabase backend for Board Spark AI, including database migrations, authentication, and Row Level Security (RLS) policies.

## Prerequisites
- Supabase account (sign up at https://supabase.com)
- Supabase CLI installed (`npm install -g supabase`)
- Node.js 20.x or higher
- Git

## Initial Setup

### 1. Create a Supabase Project
1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in project details:
   - **Name**: board-spark-ai (or your preferred name)
   - **Database Password**: Create a strong password (save this securely)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Select appropriate plan

### 2. Get Your Project Credentials
After project creation, navigate to **Settings > API**:
- **Project URL**: `https://[your-project-ref].supabase.co`
- **Project API Key (anon, public)**: Your public API key
- **Service Role Key**: Your service role key (keep this secret!)

### 3. Configure Local Environment
Create a `.env.local` file in your project root:

```env
VITE_SUPABASE_URL=https://[your-project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

For production (Vercel), add these as environment variables in your project settings.

## Database Setup

### Option A: Using Supabase CLI (Recommended)

1. **Login to Supabase CLI**
   ```bash
   supabase login
   ```

2. **Link your project**
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. **Push migrations to your project**
   ```bash
   supabase db push
   ```

4. **Verify migrations**
   ```bash
   supabase db diff
   ```

### Option B: Manual Migration via Dashboard

1. Go to **Database > SQL Editor** in your Supabase dashboard
2. Run migrations in order from `supabase/migrations/` directory
3. Execute each `.sql` file starting from the oldest timestamp
4. Verify each migration succeeds before proceeding

## Key Migrations Explained

### Core Schema (20251018144907)
- Creates foundational tables: `boards`, `documents`, `profiles`
- Sets up organization structure
- Establishes board memberships and user roles

### Board Members (20251020111120)
- Creates `board_members` table with Public/Internal/Confidential fields
- Implements RLS policies for data access control
- Supports member types: board, executive, key_staff

### RLS Insert Policy Fix (20251101000001)
- **Important**: Fixes INSERT policy for board_members
- Ensures term_expiry is optional (NULL allowed)
- Allows chairs and directors to add new members

## Authentication Setup

### 1. Configure Auth Providers

Navigate to **Authentication > Providers** in Supabase dashboard:

#### Email/Password (Default)
- ✅ Enabled by default
- Configure email templates under **Authentication > Email Templates**

#### Magic Link (Recommended)
1. Enable "Enable Email Confirmations"
2. Customize confirmation email
3. Set redirect URL: `https://your-domain.com/auth/callback`

#### OAuth Providers (Optional)
- **Google**: Configure OAuth credentials
- **GitHub**: Add GitHub OAuth app
- **Microsoft**: Azure AD integration

### 2. Email Templates

Customize these templates in **Authentication > Email Templates**:
- **Confirmation**: Welcome new users
- **Magic Link**: Passwordless login
- **Reset Password**: Password recovery
- **Change Email**: Email change confirmation

### 3. URL Configuration

Set these in **Authentication > URL Configuration**:
- **Site URL**: `https://your-production-domain.com`
- **Redirect URLs**: 
  - `http://localhost:5173/*` (development)
  - `https://your-production-domain.com/*`
  - `https://your-vercel-domain.vercel.app/*`

## Row Level Security (RLS)

### Understanding RLS
RLS ensures users can only access data they're authorized to see. Board Spark AI implements three-tier access:

1. **Organization Admin**: Full access to their org's data
2. **Board Chair/Director**: Manage their board's data
3. **Board Member**: View and update own profile

### Key RLS Policies

#### boards table
```sql
-- Users can view boards in their organization
-- Admins/Chairs can manage boards
```

#### board_members table
```sql
-- Members can view others in same board
-- Admins/Chairs can insert/update/delete
-- Members can update own profile
```

#### documents table
```sql
-- Access based on board membership
-- Confidential documents require higher role
```

### Testing RLS Policies

1. **Via SQL Editor**:
   ```sql
   -- Set user context for testing
   SET request.jwt.claim.sub = 'user-uuid-here';
   
   -- Try operations as that user
   SELECT * FROM board_members;
   ```

2. **Via Application**:
   - Create test users with different roles
   - Verify access restrictions work correctly

## Common Issues & Solutions

### Issue 1: INSERT fails with RLS violation
**Symptom**: "new row violates row-level security policy"
**Solution**: 
- Ensure migration `20251101000001_fix_board_members_insert_policy.sql` is applied
- Verify user has correct role (chair/director) in board_memberships
- Check `has_role()` function is defined

### Issue 2: term_expiry required error
**Symptom**: "term_expiry cannot be null"
**Solution**:
- Apply migration `20251101000001` which makes term_expiry optional
- Update form schema to allow null values

### Issue 3: Unauthorized access
**Symptom**: 401 or 403 errors in browser console
**Solution**:
- Verify JWT token is valid (check localStorage)
- Ensure user is authenticated
- Check RLS policies allow the operation

### Issue 4: Email confirmation not received
**Solution**:
- Check Supabase **Authentication > Logs** for delivery status
- Verify SMTP settings if using custom email
- Check spam folder
- Ensure email template is configured

## Data Access Levels

### Public Fields (Anyone in org can see)
- Full name, position, profile photo
- LinkedIn profile (if published)
- Professional qualifications
- Public contact info

### Internal Fields (Board members only)
- Personal email, phone
- Home address
- Date of birth
- Conflict of interest declarations

### Confidential Fields (Admins only)
- Health notes
- Emergency contacts
- Compensation details
- Audit records

## Functions & Triggers

### has_role(user_id, role)
Custom function to check user roles:
```sql
CREATE OR REPLACE FUNCTION has_role(user_id UUID, required_role app_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id 
    AND role = required_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Auto-update timestamps
Triggers on `board_members`, `documents`, etc.:
```sql
CREATE TRIGGER update_board_members_updated_at
  BEFORE UPDATE ON board_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Backup & Recovery

### Automated Backups
Supabase Pro/Team plans include:
- Daily automated backups
- Point-in-time recovery (PITR)
- Backup retention: 7-30 days

### Manual Backups
```bash
# Export database schema
supabase db dump --data-only > backup.sql

# Restore from backup
psql -h db.project-ref.supabase.co -U postgres -d postgres < backup.sql
```

## Performance Optimization

### Indexes
Key indexes are created in migrations:
```sql
CREATE INDEX idx_board_members_board_id ON board_members(board_id);
CREATE INDEX idx_board_members_status ON board_members(status);
CREATE INDEX idx_documents_board_id ON documents(board_id);
```

### Query Performance
- Use `select('specific, columns')` instead of `select('*')`
- Implement pagination for large datasets
- Use RLS wisely (complex policies can slow queries)

## Monitoring & Logs

### Database Logs
Access via **Database > Logs**:
- Slow queries
- Error logs
- Connection stats

### Authentication Logs  
Access via **Authentication > Logs**:
- Login attempts
- Failed authentications
- OAuth callback errors

### Usage & Quotas
Monitor in **Settings > Usage**:
- Database size
- Bandwidth usage
- Storage usage
- Auth user count

## Security Best Practices

1. **Never commit secrets**
   - Use `.env` files (gitignored)
   - Rotate keys if accidentally exposed

2. **Use service role key only server-side**
   - Never expose in client code
   - Use for admin operations only

3. **Enable MFA for admin accounts**
   - Protect Supabase dashboard access
   - Require 2FA for production deploys

4. **Regular security audits**
   - Review RLS policies quarterly
   - Check for unused permissions
   - Monitor authentication logs

5. **Keep migrations versioned**
   - Never modify old migrations
   - Create new migration for fixes
   - Test migrations in staging first

## Deployment Checklist

Before going to production:

- [ ] All migrations applied successfully
- [ ] RLS policies tested thoroughly
- [ ] Authentication providers configured
- [ ] Email templates customized
- [ ] Environment variables set in Vercel
- [ ] Backup strategy configured
- [ ] Monitoring alerts set up
- [ ] API rate limits reviewed
- [ ] Database indexes optimized
- [ ] Security audit completed

## Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **Supabase Discord**: https://discord.supabase.com
- **Board Spark AI Issues**: https://github.com/DRycroft/board-spark-ai/issues

## Migration Timeline

| Migration | Date | Description |
|-----------|------|-------------|
| 20251018144907 | Oct 18 | Initial schema setup |
| 20251020111120 | Oct 20 | Board members table |
| 20251101000001 | Nov 1 | Fix RLS INSERT policy |

---

**Need help?** Open an issue on GitHub or consult the Supabase documentation.
