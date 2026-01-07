# Board Spark AI - Quick Reference

## Essential Commands

### Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test

# Run linting
npm run lint
```

### Supabase CLI
```bash
# Login to Supabase
supabase login

# Initialize Supabase locally
supabase init

# Start local Supabase
supabase start

# Link to remote project
supabase link --project-ref your-project-ref

# Push migrations to remote
supabase db push

# Pull remote schema
supabase db pull

# Generate TypeScript types
supabase gen types typescript --local > src/integrations/supabase/types.ts

# View database diff
supabase db diff

# Create new migration
supabase migration new migration_name

# Reset local database
supabase db reset
```

## Environment Variables

### Required (.env.local)
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Optional
```env
VITE_ENABLE_ANALYTICS=true
VITE_SENTRY_DSN=your-sentry-dsn
NODE_ENV=development|production
```

## Supabase Quick Queries

### Check User's Boards
```sql
SELECT b.* 
FROM boards b
JOIN board_memberships bm ON b.id = bm.board_id
WHERE bm.user_id = auth.uid();
```

### View Active Board Members
```sql
SELECT * FROM board_members
WHERE board_id = 'board-uuid-here'
AND status = 'active';
```

### Check User Roles
```sql
SELECT role FROM profiles
WHERE id = auth.uid();
```

### View RLS Policies
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'board_members';
```

## Common Supabase Operations

### Authentication
```typescript
// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123'
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// Sign out
await supabase.auth.signOut();

// Get current user
const { data: { user } } = await supabase.auth.getUser();
```

### Database Queries
```typescript
// Select with filters
const { data, error } = await supabase
  .from('board_members')
  .select('*')
  .eq('board_id', boardId)
  .eq('status', 'active');

// Insert
const { data, error } = await supabase
  .from('board_members')
  .insert({ 
    full_name: 'John Doe',
    position: 'Director',
    board_id: boardId 
  });

// Update
const { data, error } = await supabase
  .from('board_members')
  .update({ status: 'inactive' })
  .eq('id', memberId);

// Delete
const { data, error } = await supabase
  .from('board_members')
  .delete()
  .eq('id', memberId);

// Join tables
const { data, error } = await supabase
  .from('board_members')
  .select(`
    *,
    boards (
      name,
      organization_name
    )
  `)
  .eq('board_id', boardId);
```

## Project Structure

```
board-spark-ai/
├── .github/
│   └── workflows/          # CI/CD workflows
│       └── lighthouse.yml  # Performance audits
├── public/                 # Static assets
├── src/
│   ├── components/        # React components
│   │   ├── ui/           # shadcn/ui components
│   │   └── AddPersonDialog.tsx
│   ├── config/           # Configuration files
│   ├── hooks/            # Custom React hooks
│   ├── integrations/     # External integrations
│   │   └── supabase/    # Supabase client & types
│   ├── lib/             # Utility functions
│   ├── pages/           # Page components
│   └── types/           # TypeScript type definitions
├── supabase/
│   └── migrations/      # Database migrations
├── .env.local           # Local environment variables
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vercel.json          # Vercel deployment config
```

## Key Files

### Database Types
`src/integrations/supabase/types.ts` - Auto-generated TypeScript types for database schema

### Supabase Client
`src/integrations/supabase/client.ts` - Configured Supabase client instance

### Form Components
- `src/components/AddPersonDialog.tsx` - Add board member form
- Dynamic field rendering based on templates

### Configuration
- `vercel.json` - Headers, rewrites, caching rules
- `vite.config.ts` - Vite build configuration
- `tsconfig.json` - TypeScript configuration

## Troubleshooting

### Issue: Build fails with type errors
```bash
# Regenerate Supabase types
supabase gen types typescript --local > src/integrations/supabase/types.ts
# or from remote
supabase gen types typescript --project-id your-project > src/integrations/supabase/types.ts
```

### Issue: Local Supabase won't start
```bash
# Stop and remove containers
supabase stop
docker system prune

# Restart
supabase start
```

### Issue: RLS policy blocking inserts
```sql
-- Check if user has required role
SELECT has_role(auth.uid(), 'org_admin'::app_role);

-- View user's board memberships
SELECT * FROM board_memberships WHERE user_id = auth.uid();
```

### Issue: Authentication not persisting
```typescript
// Ensure you're handling session properly
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    // User signed in
  }
  if (event === 'SIGNED_OUT') {
    // User signed out
  }
});
```

## Useful Links

| Resource | URL |
|----------|-----|
| Supabase Dashboard | https://app.supabase.com |
| Supabase Docs | https://supabase.com/docs |
| Vercel Dashboard | https://vercel.com/dashboard |
| GitHub Repo | https://github.com/DRycroft/board-spark-ai |
| Vite Docs | https://vitejs.dev |
| React Docs | https://react.dev |
| shadcn/ui | https://ui.shadcn.com |

## Database Schema Quick Reference

### Tables
- **boards** - Board information
- **board_members** - Team members (board/executive/staff)
- **board_memberships** - User access to boards
- **profiles** - User profiles and org membership
- **documents** - Board documents and files
- **agendas** - Meeting agendas
- **action_items** - Tasks and action items
- **staff_form_templates** - Customizable form templates

### Enums
- **app_role**: org_admin, chair, director, observer
- **member_type**: board, executive, key_staff
- **document_type**: agenda, minutes, report, policy, etc.

## Performance Tips

1. **Use specific selects**: `select('id, name')` instead of `select('*')`
2. **Implement pagination**: Use `.range(0, 9)` for large datasets
3. **Enable caching**: Configure appropriate Cache-Control headers
4. **Optimize images**: Use Vercel's image optimization
5. **Lazy load components**: Use React.lazy() for code splitting

## Security Checklist

- [ ] All secrets in environment variables
- [ ] RLS enabled on all tables
- [ ] Service role key not in client code
- [ ] HTTPS enforced in production
- [ ] CORS configured properly
- [ ] Rate limiting considered
- [ ] Input validation on all forms
- [ ] XSS protection headers set
- [ ] SQL injection prevented (use parameterized queries)

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: description of changes"

# Push to GitHub
git push origin feature/your-feature-name

# Create pull request on GitHub
```

### Commit Message Convention
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Formatting, no code change
- `refactor:` Code restructuring
- `test:` Adding tests
- `chore:` Maintenance tasks

## Contact & Support

- **Issues**: https://github.com/DRycroft/board-spark-ai/issues
- **Discussions**: https://github.com/DRycroft/board-spark-ai/discussions
- **Supabase Support**: support@supabase.io

---

**Last Updated**: November 1, 2025
