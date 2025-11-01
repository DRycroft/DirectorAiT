# Changelog

All notable changes to Board Spark AI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Phase 1 - Critical Fixes (November 1, 2025)

#### Added
- **Phone Validation Library** (`src/lib/phoneValidation.ts`)
  - Unified phone number validation supporting 16 countries
  - E.164 international format support
  - Country-specific validation patterns
  - Zod schema integration for forms

- **Logging Utility** (`src/lib/logger.ts`)
  - Development-only logging that doesn't run in production
  - Replaces console.log statements
  - Supports info, warn, error, and debug levels

- **Environment Validation** (`src/lib/env.ts`)
  - Runtime validation of required environment variables
  - Prevents silent failures from missing configuration
  - Type-safe environment variable access

- **Database Migrations**
  - Baseline migration from consolidated schema
  - E.164 phone number format constraints
  - Performance indexes for frequently queried tables
  - Migration strategy documentation

#### Changed
- **TypeScript Configuration**
  - Enabled strict mode in `tsconfig.json` and `tsconfig.app.json`
  - Enabled `noImplicitAny`, `strictNullChecks`, `noUnusedParameters`, `noUnusedLocals`
  - Improved type safety across the codebase

- **SignUp Component** (`src/pages/SignUp.tsx`)
  - Replaced hardcoded NZ-only phone validation with international support
  - Now uses `PhoneInput` component for all phone fields
  - Supports 16 countries instead of just New Zealand
  - Uses unified `phoneSchema` from validation library

- **Database Migrations**
  - Archived 56 old migration files to `migrations_archive/`
  - Created clean baseline migration from production schema
  - Implemented descriptive migration naming convention

#### Fixed
- **Critical: International User Signup**
  - Users from countries other than New Zealand can now sign up
  - Phone validation no longer blocks international phone numbers
  - Consistent phone validation across all forms

- **Console Logs**
  - Replaced production console.log with proper logging utility
  - Logs now only appear in development environment

- **Migration Chaos**
  - Consolidated 56+ migrations into single baseline
  - Clear migration strategy and naming convention
  - Reduced deployment risk and merge conflicts

#### Security
- Added E.164 format constraints to prevent invalid phone data
- Environment variable validation prevents configuration errors
- Improved type safety reduces runtime errors

#### Performance
- Added indexes for board_members, board_papers, compliance_items, and archived_documents
- Improved query performance for organization-specific lookups
- Optimized compliance due date queries

#### Documentation
- Created `supabase/MIGRATION_STRATEGY.md` with comprehensive migration guidelines
- Added JSDoc comments to new utility functions
- Documented phone validation patterns and examples

### Technical Debt Addressed
- TypeScript strict mode enabled (incremental adoption)
- Phone validation inconsistencies resolved
- Database migration strategy established
- Production logging cleaned up

### Breaking Changes
None - All changes are backward compatible

### Migration Notes
For existing deployments:
1. Apply new migrations in order: baseline → phone constraints → indexes
2. Existing phone numbers will be automatically cleaned to E.164 format
3. No data loss or breaking changes to existing functionality

---

## [Previous Versions]

See git history for changes prior to November 1, 2025.
