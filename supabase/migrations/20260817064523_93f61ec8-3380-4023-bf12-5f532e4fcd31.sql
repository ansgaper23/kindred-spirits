-- This migration re-applies columns that are missing from the generated types
-- to ensure they are properly reflected in the project's type system.

alter table public.profiles
  add column if not exists github_access_token text,
  add column if not exists github_username text;

alter table public.repositories
  add column if not exists default_branch text not null default 'main',
  add column if not exists html_url text;

alter table public.proposed_edits
  add column if not exists new_content text;
