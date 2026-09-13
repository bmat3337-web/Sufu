-- ============================================================================
-- SUFU Schema v1 — tables, RLS, triggers, RPCs, indexes
-- Implements docs/prd/sufu-backend.md (Data Model + RLS matrix)
-- Principle: anonymous = read published public data; authenticated = create +
-- own writes; privileged fields (views, featured, verified_*, aggregates) are
-- never client-writable (column revokes + RPCs/triggers only).
-- ============================================================================

create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- 1. Lookup tables
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  "group" text not null check ("group" in ('services','marketplace','jobs','businesses')),
  slug text not null unique
);

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table public.suburbs (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete cascade,
  name text not null,
  unique (city_id, name)
);

-- ---------------------------------------------------------------------------
-- 2. profiles — one row per auth user; covers providers, sellers, businesses
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  is_business boolean not null default false,
  category text,
  tagline text,
  bio text,
  city text,
  suburb text,
  member_since date not null default current_date,
  languages text[] not null default '{}',
  hours text,
  employees text,
  response_time text,
  avatar_url text,
  -- verification flags: server-writable only (Edge Function / service role)
  verified_phone boolean not null default false,
  verified_email boolean not null default false,
  verified_identity boolean not null default false,
  verified_business boolean not null default false,
  -- aggregate counters: trigger-maintained from reviews
  rating numeric(2,1) not null default 0,
  review_count int not null default 0,
  completed_jobs int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. listings + provider content
-- ---------------------------------------------------------------------------
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('service','product','job')),
  title text not null,
  description text not null,
  category text,
  price numeric(12,2),
  salary_label text,
  condition text,
  employment_type text,
  remote boolean not null default false,
  city text,
  suburb text,
  provider_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active','closed','removed')),
  views int not null default 0,          -- increment only via RPC
  featured boolean not null default false, -- service-role only
  tags text[] not null default '{}',
  posted_at timestamptz not null default now()
);

create table public.provider_services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  price_from numeric(12,2) not null default 0
);

create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  kind text
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  text text,
  created_at timestamptz not null default now(),
  unique (provider_id, author_id)
);

-- ---------------------------------------------------------------------------
-- 4. messaging
-- ---------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete set null,
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_a, user_b, listing_id),
  check (user_a < user_b)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

-- ---------------------------------------------------------------------------
-- 5. saved / applications / reports
-- ---------------------------------------------------------------------------
create table public.saved_listings (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (profile_id, listing_id)
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  cover_note text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique (listing_id, applicant_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('listing','profile')),
  target_id uuid not null,
  reason text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 6. Row level security
-- ============================================================================
alter table public.categories enable row level security;
alter table public.cities enable row level security;
alter table public.suburbs enable row level security;
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.provider_services enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.reviews enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.saved_listings enable row level security;
alter table public.applications enable row level security;
alter table public.reports enable row level security;

-- lookup tables: public read
create policy categories_select on public.categories for select to anon, authenticated using (true);
create policy cities_select on public.cities for select to anon, authenticated using (true);
create policy suburbs_select on public.suburbs for select to anon, authenticated using (true);

-- profiles: public read; owner update only (verified_*/aggregates column-revoked below)
create policy profiles_select on public.profiles for select to anon, authenticated using (true);
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- listings: anon sees active only; owner sees own (incl. closed/removed); owner writes
create policy listings_select on public.listings for select to anon, authenticated
  using (status = 'active' or provider_id = auth.uid());
create policy listings_insert on public.listings for insert to authenticated
  with check (provider_id = auth.uid() and status = 'active');
create policy listings_update_own on public.listings for update to authenticated
  using (provider_id = auth.uid())
  with check (provider_id = auth.uid() and status in ('active','closed','removed'));
create policy listings_delete_own on public.listings for delete to authenticated
  using (provider_id = auth.uid());

-- provider content: public read, owner writes
create policy provider_services_select on public.provider_services for select to anon, authenticated using (true);
create policy provider_services_insert on public.provider_services for insert to authenticated with check (provider_id = auth.uid());
-- TRUNCATED HERE IN RECOVERED ZIP; continuation restored by the next migration.
