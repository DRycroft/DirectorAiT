# Board-Connect Deployment Guide

## Prerequisites

- Node.js 20.x or later
- Vercel account (for production deployment)
- Lovable Cloud backend (already configured)

## Environment Variables

### Required Variables

All deployments require these environment variables:

```bash
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=[anon-key]
VITE_SUPABASE_PROJECT_ID=[project-id]
```

### Setting Environment Variables

#### Local Development
1. **In Lovable:** The `.env` file is auto-generated and managed by Lovable Cloud
2. **Self-hosting:** Copy `.env.example` to `.env` and fill in values
3. **IMPORTANT:** NEVER commit `.env` to git (add to `.gitignore`)

#### Vercel Production
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each `VITE_*` variable:
   - Name: `VITE_SUPABASE_URL`
   - Value: Your Supabase URL
   - Environment: Production, Preview, Development (select all)
3. Repeat for `VITE_SUPABASE_PUBLISHABLE_KEY` and `VITE_SUPABASE_PROJECT_ID`
4. Redeploy after adding variables

## Database Migrations

### Running Migrations

Migrations are automatically managed by Lovable Cloud. However, if you need to apply them manually:

1. **Via Lovable Cloud:**
   - Open project in Lovable
   - Navigate to Backend view
   - Migrations are applied automatically when changes are made

2. **Via Supabase CLI (if self-hosting):**
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   
   # Link to your project
   supabase link --project-ref [project-id]
   
   # Apply migrations
   supabase db push
   ```

### Migration Checklist

Before deploying new database changes:

- [ ] Test migration in development environment
- [ ] Verify RLS policies are in place for new tables
- [ ] Check that indexes are created for performance-critical queries
- [ ] Ensure backward compatibility with current production code
- [ ] Have rollback plan ready (previous migration state)
- [ ] Backup production database if making destructive changes

## Deployment Process

### 1. Pre-Deployment Checklist

- [ ] All tests passing (`npm test`)
- [ ] Lint checks pass (`npm run lint`)
- [ ] Build succeeds locally (`npm run build`)
- [ ] Environment variables configured in Vercel
- [ ] Database migrations tested and ready
- [ ] Security scan reviewed (check Lovable Security view)

### 2. Deploy to Vercel

#### Automatic Deployment (Recommended)
- Push to `main` branch → automatic deployment
- Push to other branches → preview deployment

#### Manual Deployment
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### 3. Post-Deployment Verification

- [ ] Visit production URL and verify homepage loads
- [ ] Test authentication flow (sign up, login, logout)
- [ ] Verify database operations (CRUD operations work)
- [ ] Check browser console for errors
- [ ] Test critical user flows
- [ ] Monitor Vercel deployment logs

## Security Considerations

### Secret Rotation

If you need to rotate Supabase keys:

1. **Generate New Keys:**
   - Open Lovable Cloud backend
   - Navigate to Settings → API
   - Generate new anon key

2. **Update Vercel:**
   - Go to Vercel → Settings → Environment Variables
   - Update `VITE_SUPABASE_PUBLISHABLE_KEY`
   - Redeploy application

3. **Update Local Development:**
   - Update `.env` file (don't commit!)
   - Restart development server

### Storage Security (ACTION REQUIRED)

⚠️ **CRITICAL**: Storage buckets currently lack RLS policies. Before production use:

1. Open Lovable Cloud backend → Storage → Policies
2. For each bucket (board-documents, executive-reports, meeting-minutes, special-papers):
   - Add SELECT, INSERT, UPDATE, DELETE policies
   - Ensure org-based isolation: `(storage.foldername(name))[1] = (SELECT org_id::text FROM profiles WHERE id = auth.uid())`

See Security view in Lovable for detailed instructions.

## Rollback Procedure

If a deployment causes issues:

1. **Immediate Rollback:**
   ```bash
   # Via Vercel Dashboard
   # Deployments → Find last working deployment → Promote to Production
   ```

2. **Database Rollback:**
   - Lovable Cloud migrations cannot be easily rolled back
   - Contact support or restore from backup
   - Prevention: Always test migrations in development first

3. **Code Rollback:**
   ```bash
   git revert [commit-hash]
   git push origin main
   ```

## Monitoring

### Application Logs
- Vercel Dashboard → Your Project → Logs
- Filter by date/deployment to find errors

### Database Performance
- Lovable Cloud backend → Database → Query Performance
- Check for slow queries and add indexes as needed

### Error Tracking
- Browser console errors visible in production
- Consider adding error tracking service (Sentry, LogRocket)

## Common Issues

### Build Fails
- **Check environment variables** are set in Vercel
- **Verify Node.js version** matches local (20.x)
- **Check build logs** in Vercel dashboard

### Authentication Not Working
- **Verify Supabase URL and key** in environment variables
- **Check auth is enabled** in Lovable Cloud backend
- **Confirm auth.users table** exists

### Database Queries Fail
- **Check RLS policies** are properly configured
- **Verify user is authenticated** before making queries
- **Test queries** in Lovable Cloud backend SQL editor

## Support

- **Lovable Docs**: https://docs.lovable.dev/
- **Lovable Discord**: https://discord.gg/lovable
- **Vercel Docs**: https://vercel.com/docs

---

**Last Updated**: 2025-11-02
**Maintained By**: Development Team
