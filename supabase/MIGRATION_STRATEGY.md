# Database Migration Strategy

## Overview

This document outlines the migration strategy for Board Spark AI database schema changes.

## Migration History Cleanup (November 2025)

### Problem
- 56 individual migration files with UUID-based names
- 56 backup migration files
- 3 consolidated migration files at root
- Unclear source of truth and deployment risk

### Solution
- **Baseline Migration**: Created `20251101000000_baseline_schema.sql` from production schema
- **Archived Old Migrations**: Moved all previous migrations to `migrations_archive/`
- **New Migration Naming**: Use descriptive names with timestamp prefix

## Migration Naming Convention

Format: `YYYYMMDDHHMMSS_descriptive_name.sql`

Examples:
- `20251101000000_baseline_schema.sql` - Initial baseline
- `20251101000001_add_phone_e164_constraints.sql` - Phone validation
- `20251101000002_add_performance_indexes.sql` - Performance indexes

## Migration Guidelines

### Creating New Migrations

1. **Use Descriptive Names**: Migration names should clearly describe what they do
2. **One Purpose Per Migration**: Each migration should have a single, clear purpose
3. **Include Rollback**: When possible, include rollback instructions in comments
4. **Test Locally First**: Always test migrations on local Supabase instance
5. **Document Breaking Changes**: Add comments for any breaking changes

### Migration Template

```sql
-- Migration: [Brief description]
-- Created: [Date]
-- Author: [Name]
-- Purpose: [Detailed explanation]

-- Forward migration
[SQL statements]

-- Rollback (if applicable)
-- [Rollback SQL statements]
```

### Applying Migrations

**Local Development:**
```bash
supabase db reset  # Reset to baseline
supabase db push   # Apply all migrations
```

**Production:**
```bash
supabase db push --linked  # Apply to linked production project
```

### Migration Order

Migrations are applied in alphabetical order by filename. The timestamp prefix ensures correct ordering.

## Current Migration Status

### Baseline (20251101000000)
- Complete schema from production
- All tables, RLS policies, functions, and triggers
- Vector embeddings and audit trails

### Phone Validation (20251101000001)
- E.164 format constraints for phone numbers
- Data cleanup for existing phone numbers
- Supports international phone formats

### Performance Indexes (20251101000002)
- Indexes for frequently queried columns
- Improves query performance for large datasets
- Covers board members, papers, compliance, and documents

## Best Practices

1. **Never Edit Applied Migrations**: Once a migration is applied to production, never edit it
2. **Create New Migrations for Changes**: Always create a new migration for schema changes
3. **Backup Before Major Changes**: Always backup production database before major migrations
4. **Monitor After Deployment**: Watch for errors and performance issues after applying migrations
5. **Document Dependencies**: Note any dependencies between migrations

## Troubleshooting

### Migration Fails
1. Check Supabase logs for error details
2. Verify migration syntax locally
3. Check for conflicting constraints or indexes
4. Rollback if necessary and fix issues

### Rollback Strategy
1. Create a new migration that reverses the changes
2. Name it clearly: `YYYYMMDDHHMMSS_rollback_previous_migration.sql`
3. Test rollback locally before applying to production

## Archive

Old migrations (pre-November 2025) are archived in `migrations_archive/` for reference only.
These should not be applied to new environments.
