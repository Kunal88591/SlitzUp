-- SlitzUp organizer-only schema
-- NOTE: This resets SlitzUp tables. Run in Supabase SQL editor.

create extension if not exists pgcrypto;

drop table if exists public.settlements cascade;
drop table if exists public.expenses cascade;
drop table if exists public.group_members cascade;
drop table if exists public.members cascade;
drop table if exists public.groups cascade;
drop table if exists public.users cascade;

create table public.users (
  id uuid primary key,
  email text not null unique,
  full_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  organizer_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  organizer_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  amount numeric(12, 2) not null check (amount > 0),
  paid_by_member_id uuid not null references public.members(id) on delete restrict,
  split_type text not null check (split_type in ('equal', 'percentage', 'exact')),
  split_data jsonb not null,
  created_at timestamptz not null default now()
);

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  organizer_id uuid not null references public.users(id) on delete cascade,
  from_member_id uuid not null references public.members(id) on delete cascade,
  to_member_id uuid not null references public.members(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create index idx_groups_organizer on public.groups(organizer_id, created_at desc);
create index idx_members_group on public.members(group_id, created_at asc);
create index idx_expenses_group_created on public.expenses(group_id, created_at desc);
create index idx_settlements_group_created on public.settlements(group_id, created_at desc);

alter table public.users enable row level security;
alter table public.groups enable row level security;
alter table public.members enable row level security;
alter table public.expenses enable row level security;
alter table public.settlements enable row level security;

create policy "users can read own profile"
on public.users for select
using (auth.uid() = id);

create policy "users can insert own profile"
on public.users for insert
with check (auth.uid() = id);

create policy "users can update own profile"
on public.users for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "organizer manages own groups"
on public.groups for all
using (organizer_id = auth.uid())
with check (organizer_id = auth.uid());

create policy "organizer manages own members"
on public.members for all
using (organizer_id = auth.uid())
with check (organizer_id = auth.uid());

create policy "organizer manages own expenses"
on public.expenses for all
using (organizer_id = auth.uid())
with check (organizer_id = auth.uid());

create policy "organizer manages own settlements"
on public.settlements for all
using (organizer_id = auth.uid())
with check (organizer_id = auth.uid());
