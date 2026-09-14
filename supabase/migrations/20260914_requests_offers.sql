-- SUFU demand engine: requests + provider offers.
-- Safe to run after the existing listings/profile schema is present.

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 160),
  description text not null check (char_length(trim(description)) between 10 and 5000),
  category text,
  request_type text not null check (request_type in ('service','product','job','business')),
  budget numeric(14,2) check (budget is null or budget >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  city text not null,
  suburb text,
  preferred_date date,
  status text not null default 'open' check (status in ('open','matched','closed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists requests_open_location_idx on public.requests (status, city, suburb, created_at desc);
create index if not exists requests_type_idx on public.requests (request_type, status, created_at desc);
create index if not exists requests_requester_idx on public.requests (requester_id, created_at desc);

create table if not exists public.request_offers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  provider_id uuid not null references auth.users(id) on delete cascade,
  price numeric(14,2) check (price is null or price >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  availability text not null check (char_length(trim(availability)) between 2 and 500),
  duration text,
  terms text,
  message text not null check (char_length(trim(message)) between 2 and 3000),
  status text not null default 'pending' check (status in ('pending','accepted','declined','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, provider_id)
);

create index if not exists request_offers_request_idx on public.request_offers (request_id, status, created_at desc);
create index if not exists request_offers_provider_idx on public.request_offers (provider_id, created_at desc);

alter table public.requests enable row level security;
alter table public.request_offers enable row level security;

drop policy if exists "requests_public_open_read" on public.requests;
create policy "requests_public_open_read" on public.requests
  for select using (status = 'open' or requester_id = auth.uid());

drop policy if exists "requests_owner_insert" on public.requests;
create policy "requests_owner_insert" on public.requests
  for insert with check (requester_id = auth.uid());

drop policy if exists "requests_owner_update" on public.requests;
create policy "requests_owner_update" on public.requests
  for update using (requester_id = auth.uid()) with check (requester_id = auth.uid());

drop policy if exists "requests_owner_delete" on public.requests;
create policy "requests_owner_delete" on public.requests
  for delete using (requester_id = auth.uid());

drop policy if exists "offers_requester_or_provider_read" on public.request_offers;
create policy "offers_requester_or_provider_read" on public.request_offers
  for select using (
    provider_id = auth.uid()
    or exists (select 1 from public.requests r where r.id = request_offers.request_id and r.requester_id = auth.uid())
  );

drop policy if exists "offers_provider_insert" on public.request_offers;
create policy "offers_provider_insert" on public.request_offers
  for insert with check (
    provider_id = auth.uid()
    and exists (select 1 from public.requests r where r.id = request_offers.request_id and r.status = 'open' and r.requester_id <> auth.uid())
  );

drop policy if exists "offers_participant_update" on public.request_offers;
create policy "offers_participant_update" on public.request_offers
  for update using (
    provider_id = auth.uid()
    or exists (select 1 from public.requests r where r.id = request_offers.request_id and r.requester_id = auth.uid())
  ) with check (
    provider_id = auth.uid()
    or exists (select 1 from public.requests r where r.id = request_offers.request_id and r.requester_id = auth.uid())
  );

drop policy if exists "offers_provider_delete" on public.request_offers;
create policy "offers_provider_delete" on public.request_offers
  for delete using (provider_id = auth.uid());
