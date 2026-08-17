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

-- Explicitly grant permissions to ensure Data API access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
