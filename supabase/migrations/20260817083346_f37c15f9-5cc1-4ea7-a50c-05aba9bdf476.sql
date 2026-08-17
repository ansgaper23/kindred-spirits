-- Fix profiles primary key constraint visibility for upsert
-- Profiles table already has profiles_pkey on (id)
-- We ensure permissions are correctly set for upsert
GRANT INSERT, UPDATE, SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
