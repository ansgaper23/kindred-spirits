# Fix RLS Violation for Profiles Table

The user is encountering a `new row violates row-level security policy for table "profiles"` error during the `ensureProfile` server function call. This typically happens when a user signs in for the first time and the app tries to create their profile row, but the RLS policies or the way `upsert` is handled prevents it.

## User Review Required

> [!IMPORTANT]
> This fix involves updating database security policies to allow users to create their own profile records upon first login.

## Proposed Changes

### Database (Supabase)

#### Fix RLS Policies
- The `ensureProfile` function uses `upsert`. In Supabase, `upsert` requires both `INSERT` and `UPDATE` permissions.
- I will verify and ensure that the `INSERT` policy `Users can insert their own profile` correctly matches `auth.uid() = id`.
- I will ensure `GRANT` statements are correctly applied to the `authenticated` role for the `profiles` table.

### Backend (TanStack Start)

#### Profile Creation Logic
- Update `src/lib/profile/profile.functions.ts` to be more resilient. If `upsert` fails due to RLS nuances with `onConflict`, I'll switch to a "try select, then insert if missing" pattern which is often more stable with RLS.

## Technical Details

### SQL Migration
```sql
-- Ensure the insert policy exists and is correct
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Users can insert their own profile'
    ) THEN
        create policy "Users can insert their own profile" on public.profiles
          for insert
          with check (auth.uid() = id);
    END IF;
END $$;

-- Explicitly grant permissions if they were somehow missed
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
```

### Profile Function Refactor
```typescript
// src/lib/profile/profile.functions.ts
// Change from upsert to:
const { data: existing } = await context.supabase
  .from("profiles")
  .select()
  .eq("id", context.userId)
  .single();

if (existing) {
  // update
} else {
  // insert
}
```
