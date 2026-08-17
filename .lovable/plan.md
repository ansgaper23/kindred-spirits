# Plan: Fix Repository ON CONFLICT Constraint

The user is experiencing a database error when selecting/connecting a repository. The error "there is no unique or exclusion constraint matching the ON CONFLICT specification" indicates that the `repositories` table does not have a unique constraint on the columns used in the `upsert` operation (`user_id` and `full_name`).

## Proposed Changes

### 1. Database Migration
- Add a new migration to ensure the `repositories_user_full_name_key` unique constraint exists on the `public.repositories` table.
- Although a previous migration attempted this, the error persists, suggesting the constraint might be missing or incorrectly defined in the current environment.

### 2. Backend Logic
- Refine the `connectRepository` server function in `src/lib/repos/repos.functions.ts` to ensure the `upsert` call matches the unique constraint.

## Technical Details
- **SQL Migration**:
  ```sql
  ALTER TABLE public.repositories 
  DROP CONSTRAINT IF EXISTS repositories_full_name_key;

  ALTER TABLE public.repositories 
  DROP CONSTRAINT IF EXISTS repositories_user_full_name_key;

  ALTER TABLE public.repositories 
  ADD CONSTRAINT repositories_user_full_name_key UNIQUE (user_id, full_name);
  ```
- **File Update**: `src/lib/repos/repos.functions.ts`
  - Ensure the `onConflict` parameter in `.upsert()` matches the defined constraint: `onConflict: 'user_id,full_name'`.

## Verification Plan
- **Pre-check**: Verify the migration applies successfully.
- **Runtime Check**: Attempt to connect a repository in the dashboard and confirm the "ON CONFLICT" error no longer appears.
