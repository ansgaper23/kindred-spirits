-- Allow users to create their own profile row (RLS was enabled with no INSERT
-- policy, so inserts were silently denied even though the table grant allowed them).
create policy "Users can insert their own profile" on public.profiles
  for insert
  with check (auth.uid() = id);

-- Store the GitHub OAuth access token on the profile so the agent can call the
-- GitHub API (list real repos, read files, commit changes, open PRs) on the
-- user's behalf. Populated after a "Sign in with GitHub" flow. Nullable because
-- email/password users won't have one until they connect GitHub.
alter table public.profiles
  add column if not exists github_access_token text,
  add column if not exists github_username text;

comment on column public.profiles.github_access_token is
  'GitHub OAuth token captured from Supabase Auth session.provider_token. Only ever read/written by the owning user via RLS. Consider moving to a vault/encrypted column before production use.';

-- Needed to branch off the right ref when applying edits, and to link out to
-- the repo without an extra GitHub call on every dashboard render.
alter table public.repositories
  add column if not exists default_branch text not null default 'main',
  add column if not exists html_url text;

-- full_name is already unique per-repo, but a repo could otherwise be
-- connected by more than one user; scope uniqueness to (user_id, full_name).
alter table public.repositories drop constraint if exists repositories_full_name_key;
alter table public.repositories add constraint repositories_user_full_name_key unique (user_id, full_name);

-- The agent stores the full new file content alongside the human-readable
-- diff, so applying an approved edit doesn't need to reconstruct it by
-- re-parsing/patching the diff text.
alter table public.proposed_edits
  add column if not exists new_content text;
