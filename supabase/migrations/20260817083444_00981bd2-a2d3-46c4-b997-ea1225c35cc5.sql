-- Ensure the 'id' column has an explicit UNIQUE constraint for upsert operations
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_key;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_key UNIQUE (id);

-- Verify and ensure permissions for authenticated users
GRANT INSERT, UPDATE, SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
