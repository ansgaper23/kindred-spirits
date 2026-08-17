-- Ensure the repositories table has the correct unique constraint for upsert
ALTER TABLE public.repositories 
DROP CONSTRAINT IF EXISTS repositories_full_name_key;

ALTER TABLE public.repositories 
DROP CONSTRAINT IF EXISTS repositories_user_full_name_key;

ALTER TABLE public.repositories 
ADD CONSTRAINT repositories_user_full_name_key UNIQUE (user_id, full_name);

-- Re-verify permissions just in case
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repositories TO authenticated;
GRANT ALL ON public.repositories TO service_role;
