-- ─────────────────────────────────────────────────────────────────
--  LuxVision AI — Supabase Schema
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ─────────────────────────────────────────────────────────────────

-- 1. Profiles table (one row per user, auto-created on signup)
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  images_used integer default 0,
  images_limit integer default 120,
  trial_ends_at timestamptz default (now() + interval '7 days'),
  plan text default 'trial',
  created_at timestamptz default now()
);

-- 2. Generations table (one row per image generated)
create table if not exists generations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  address text not null,
  style text not null,
  image_url text not null,
  prompt text,
  created_at timestamptz default now()
);

-- 3. Row Level Security — users can only see their own data
alter table profiles enable row level security;
alter table generations enable row level security;

create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can view own generations"
  on generations for select using (auth.uid() = user_id);

create policy "Users can insert own generations"
  on generations for insert with check (auth.uid() = user_id);

-- 4. Auto-create profile row when a new user signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
