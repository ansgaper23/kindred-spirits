-- CREATE app_role enum
create type public.app_role as enum ('admin', 'user');

-- PROFILES table
create table public.profiles (
    id uuid references auth.users(id) on delete cascade not null primary key,
    email text unique not null,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- USER_ROLES table
create table public.user_roles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    role app_role not null,
    unique (user_id, role)
);

-- REPOSITORIES table
create table public.repositories (
    id uuid primary key default gen_random_uuid(),
    owner text not null,
    name text not null,
    full_name text not null unique,
    description text,
    installation_id text,
    user_id uuid references auth.users(id) on delete cascade not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- CONVERSATIONS table
create table public.conversations (
    id uuid primary key default gen_random_uuid(),
    repository_id uuid references public.repositories(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    title text,
    status text default 'active',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- MESSAGES table
create table public.messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid references public.conversations(id) on delete cascade not null,
    role text not null check (role in ('user', 'assistant', 'system')),
    content text not null,
    thought text, -- For agent "thinking out loud"
    tool_calls jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- PROPOSED_EDITS table
create table public.proposed_edits (
    id uuid primary key default gen_random_uuid(),
    message_id uuid references public.messages(id) on delete cascade not null,
    file_path text not null,
    diff text not null,
    status text default 'pending' check (status in ('pending', 'approved', 'rejected', 'applied')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    applied_at timestamp with time zone
);

-- GRANTS
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

grant select, insert, update, delete on public.repositories to authenticated;
grant all on public.repositories to service_role;

grant select, insert, update, delete on public.conversations to authenticated;
grant all on public.conversations to service_role;

grant select, insert, update, delete on public.messages to authenticated;
grant all on public.messages to service_role;

grant select, insert, update, delete on public.proposed_edits to authenticated;
grant all on public.proposed_edits to service_role;

-- RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.repositories enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.proposed_edits enable row level security;

-- SECURITY DEFINER for role check
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- POLICIES
create policy "Users can view their own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update their own profile" on public.profiles for update using (auth.uid() = id);

create policy "Users can view their own repos" on public.repositories for select using (auth.uid() = user_id);
create policy "Users can manage their own repos" on public.repositories for all using (auth.uid() = user_id);

create policy "Users can view their own conversations" on public.conversations for select using (auth.uid() = user_id);
create policy "Users can manage their own conversations" on public.conversations for all using (auth.uid() = user_id);

create policy "Users can view messages in their conversations" on public.messages for select 
using (exists (select 1 from public.conversations where id = conversation_id and user_id = auth.uid()));
create policy "Users can add messages to their conversations" on public.messages for insert 
with check (exists (select 1 from public.conversations where id = conversation_id and user_id = auth.uid()));

create policy "Users can view their proposed edits" on public.proposed_edits for select 
using (exists (
    select 1 from public.messages m 
    join public.conversations c on m.conversation_id = c.id 
    where m.id = message_id and c.user_id = auth.uid()
));
create policy "Users can update their proposed edits" on public.proposed_edits for update 
using (exists (
    select 1 from public.messages m 
    join public.conversations c on m.conversation_id = c.id 
    where m.id = message_id and c.user_id = auth.uid()
));
