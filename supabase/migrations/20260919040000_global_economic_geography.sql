-- SUFU global-first economic geography foundation
-- Geography is a matching dimension, not a product boundary.
-- Existing city/suburb fields remain compatibility fields; the global model
-- is additive and supports local, domestic, remote and cross-border discovery.

create table if not exists public.sufu_countries (
  country_code text primary key check (country_code ~ '^[A-Z]{2}$'),
  name text not null,
  default_currency text not null check (default_currency ~ '^[A-Z]{3}$'),
  supported_currencies text[] not null default '{}',
  default_locale text not null default 'en',
  supported_locales text[] not null default '{en}',
  timezone text not null default 'UTC',
  phone_calling_code text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.sufu_countries
  (country_code,name,default_currency,supported_currencies,default_locale,supported_locales,timezone,phone_calling_code)
values
  ('ZW','Zimbabwe','USD',array['USD','ZWG','ZAR','GBP','EUR'],'en',array['en','sn','nd'],'Africa/Harare','+263'),
  ('JP','Japan','JPY',array['JPY','USD'],'en',array['en','ja'],'Asia/Tokyo','+81'),
  ('CN','China','CNY',array['CNY','USD'],'en',array['en','zh'],'Asia/Shanghai','+86')
on conflict (country_code) do update set
  name = excluded.name,
  default_currency = excluded.default_currency,
  supported_currencies = excluded.supported_currencies,
  default_locale = excluded.default_locale,
  supported_locales = excluded.supported_locales,
  timezone = excluded.timezone,
  phone_calling_code = excluded.phone_calling_code,
  updated_at = now();

create table if not exists public.sufu_geography_nodes (
  id uuid primary key default gen_random_uuid(),
  country_code text not null references public.sufu_countries(country_code),
  level text not null check (level in ('country','region','city','district','locality','neighbourhood')),
  name text not null,
  code text,
  parent_id uuid references public.sufu_geography_nodes(id) on delete set null,
  provider text,
  provider_id text,
  timezone text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  unique(provider, provider_id),
  check (latitude is null or latitude between -90 and 90),
  check (longitude is null or longitude between -180 and 180)
);

create index if not exists sufu_geo_country_level_idx
  on public.sufu_geography_nodes(country_code, level, name);
create index if not exists sufu_geo_parent_idx
  on public.sufu_geography_nodes(parent_id);

-- A location selection is a reusable geographic assertion. It is deliberately
-- independent of the user's current device location.
create table if not exists public.sufu_locations (
  id uuid primary key default gen_random_uuid(),
  country_code text not null references public.sufu_countries(country_code),
  geography_node_id uuid references public.sufu_geography_nodes(id) on delete set null,
  region_code text,
  region_name text,
  city text,
  district text,
  locality text,
  neighbourhood text,
  latitude double precision,
  longitude double precision,
  radius_km numeric(8,2) check (radius_km is null or radius_km between 1 and 500),
  privacy text not null default 'area' check (privacy in ('exact','approximate','area')),
  source text not null default 'manual' check (source in ('manual','gps','map','geocoder','provider')),
  external_place_id text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (latitude is null or latitude between -90 and 90),
  check (longitude is null or longitude between -180 and 180)
);

create index if not exists sufu_locations_country_city_idx
  on public.sufu_locations(country_code, city);
create index if not exists sufu_locations_geo_node_idx
  on public.sufu_locations(geography_node_id);
create index if not exists sufu_locations_creator_idx
  on public.sufu_locations(created_by);

-- One person/business can have an origin plus multiple operating/service areas.
create table if not exists public.profile_locations (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  location_id uuid not null references public.sufu_locations(id) on delete cascade,
  role text not null check (role in ('origin','operating','service_area','fulfilment')),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (profile_id, location_id, role)
);

create index if not exists profile_locations_role_idx
  on public.profile_locations(profile_id, role, is_primary desc);

-- Listings describe supply. A service may operate over an area; a product may
-- have a fulfilment location; a job is anchored to its work location.
create table if not exists public.listing_locations (
  listing_id uuid not null references public.listings(id) on delete cascade,
  location_id uuid not null references public.sufu_locations(id) on delete cascade,
  role text not null check (role in ('supply','service_area','fulfilment','workplace')),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (listing_id, location_id, role)
);

create index if not exists listing_locations_role_idx
  on public.listing_locations(listing_id, role, is_primary desc);
create index if not exists listing_locations_location_idx
  on public.listing_locations(location_id, role);

-- Requests explicitly separate requester origin from the geography of the need.
-- This is what enables Tokyo -> Tokyo, Tokyo -> Zimbabwe and Zimbabwe -> Tokyo
-- without changing the request model.
create table if not exists public.request_locations (
  request_id uuid not null references public.requests(id) on delete cascade,
  location_id uuid not null references public.sufu_locations(id) on delete cascade,
  role text not null check (role in ('requester_origin','target','fulfilment')),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (request_id, location_id, role)
);

create index if not exists request_locations_role_idx
  on public.request_locations(request_id, role, is_primary desc);
create index if not exists request_locations_location_idx
  on public.request_locations(location_id, role);

-- Cross-border is derived from origin/target country rather than being a
-- user-maintained boolean. The generated expression remains null when a
-- request has no explicit origin/target yet.
alter table public.requests
  add column if not exists origin_country_code text references public.sufu_countries(country_code),
  add column if not exists target_country_code text references public.sufu_countries(country_code),
  add column if not exists target_location_label text,
  add column if not exists cross_border boolean generated always as (
    case
      when origin_country_code is null or target_country_code is null then null
      else origin_country_code <> target_country_code
    end
  ) stored;

alter table public.listings
  add column if not exists supply_country_code text references public.sufu_countries(country_code),
  add column if not exists fulfilment_country_code text references public.sufu_countries(country_code);

alter table public.profiles
  add column if not exists origin_country_code text references public.sufu_countries(country_code),
  add column if not exists primary_currency text check (primary_currency is null or primary_currency ~ '^[A-Z]{3}$'),
  add column if not exists preferred_locale text;

create index if not exists requests_target_country_idx
  on public.requests(target_country_code, status, created_at desc);
create index if not exists requests_cross_border_idx
  on public.requests(cross_border, status, created_at desc);
create index if not exists listings_supply_country_idx
  on public.listings(supply_country_code, status, posted_at desc);
create index if not exists listings_fulfilment_country_idx
  on public.listings(fulfilment_country_code, status, posted_at desc);
create index if not exists profiles_origin_country_idx
  on public.profiles(origin_country_code);

-- Compatibility backfill: existing Zimbabwe records become globally addressable
-- without changing the visible local experience.
update public.profiles
set origin_country_code = 'ZW'
where origin_country_code is null
  and (city is not null or suburb is not null);

update public.listings
set supply_country_code = 'ZW',
    fulfilment_country_code = case when type = 'product' then 'ZW' else fulfilment_country_code end
where supply_country_code is null
  and (city is not null or suburb is not null);

update public.requests
set origin_country_code = 'ZW',
    target_country_code = 'ZW'
where origin_country_code is null
  and target_country_code is null
  and city is not null;

-- Global search extension. Existing city/suburb filters remain supported.
create or replace function public.search_listings(filters jsonb)
returns setof public.listings
language sql
stable
security invoker
set search_path = public
as $$
  select l.*
  from public.listings l
  left join public.profiles p on p.id = l.provider_id
  where l.status = 'active'
    and (
      coalesce(filters->>'q','') = ''
      or l.title ilike '%' || filters->>'q' || '%'
      or l.description ilike '%' || filters->>'q' || '%'
      or coalesce(l.category,'') ilike '%' || filters->>'q' || '%'
      or exists (select 1 from unnest(l.tags) t where t ilike '%' || filters->>'q' || '%')
      or p.display_name ilike '%' || filters->>'q' || '%'
    )
    and (
      filters->>'group' is null
      or filters->>'group' = ''
      or (filters->>'group' = 'services' and l.type = 'service')
      or (filters->>'group' = 'marketplace' and l.type = 'product')
      or (filters->>'group' = 'jobs' and l.type = 'job')
      or (filters->>'group' = 'businesses' and p.is_business = true)
    )
    and (
      filters->>'country' is null
      or filters->>'country' = ''
      or l.supply_country_code = upper(filters->>'country')
      or l.fulfilment_country_code = upper(filters->>'country')
      or exists (
        select 1
        from public.listing_locations ll
        join public.sufu_locations sl on sl.id = ll.location_id
        where ll.listing_id = l.id
          and sl.country_code = upper(filters->>'country')
      )
    )
    and (
      filters->>'target_city' is null
      or filters->>'target_city' = ''
      or exists (
        select 1
        from public.listing_locations ll
        join public.sufu_locations sl on sl.id = ll.location_id
        where ll.listing_id = l.id
          and lower(coalesce(sl.city,'')) = lower(filters->>'target_city')
      )
    )
    and (filters->>'city' is null or filters->>'city' = '' or l.city = filters->>'city')
    and (filters->>'suburb' is null or filters->>'suburb' = '' or l.suburb = filters->>'suburb')
  order by
    case when coalesce(filters->>'sort','newest') = 'price-asc' then l.price end asc nulls last,
    case when coalesce(filters->>'sort','newest') = 'price-desc' then l.price end desc nulls last,
    case when coalesce(filters->>'sort','newest') = 'rating' then p.rating end desc nulls last,
    case when coalesce(filters->>'sort','newest') = 'newest' then l.posted_at end desc,
    l.posted_at desc
  limit least(greatest(coalesce(
    case
      when btrim(coalesce(filters->>'limit', '')) ~ '^[0-9]+$' then (filters->>'limit')::int
      else null
    end,
    100
  ), 1), 100)
  offset greatest(coalesce(
    case
      when btrim(coalesce(filters->>'offset', '')) ~ '^[0-9]+$' then (filters->>'offset')::int
      else null
    end,
    0
  ), 0);
$$;

grant execute on function public.search_listings(jsonb) to anon, authenticated;

alter table public.sufu_countries enable row level security;
alter table public.sufu_geography_nodes enable row level security;
alter table public.sufu_locations enable row level security;
alter table public.profile_locations enable row level security;
alter table public.listing_locations enable row level security;
alter table public.request_locations enable row level security;

create policy sufu_countries_public_read on public.sufu_countries
  for select to anon, authenticated using (enabled = true);

create policy sufu_geography_public_read on public.sufu_geography_nodes
  for select to anon, authenticated using (true);

create policy sufu_locations_public_read on public.sufu_locations
  for select to anon, authenticated
  using (
    privacy <> 'exact'
    or created_by = auth.uid()
  );

create policy profile_locations_public_read on public.profile_locations
  for select to anon, authenticated
  using (exists (
    select 1 from public.sufu_locations sl
    where sl.id = profile_locations.location_id
      and (sl.privacy <> 'exact' or sl.created_by = auth.uid())
  ));

create policy profile_locations_owner_write on public.profile_locations
  for insert to authenticated
  with check (profile_id = auth.uid() and exists (
    select 1 from public.sufu_locations sl where sl.id = location_id and sl.created_by = auth.uid()
  ));

create policy profile_locations_owner_update on public.profile_locations
  for update to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy profile_locations_owner_delete on public.profile_locations
  for delete to authenticated
  using (profile_id = auth.uid());

create policy listing_locations_public_read on public.listing_locations
  for select to anon, authenticated
  using (exists (
    select 1 from public.listings l
    where l.id = listing_locations.listing_id
      and (l.status = 'active' or l.provider_id = auth.uid())
  ));

create policy listing_locations_owner_write on public.listing_locations
  for insert to authenticated
  with check (
    exists (select 1 from public.listings l where l.id = listing_id and l.provider_id = auth.uid())
    and exists (select 1 from public.sufu_locations sl where sl.id = location_id and sl.created_by = auth.uid())
  );

create policy listing_locations_owner_update on public.listing_locations
  for update to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id and l.provider_id = auth.uid()))
  with check (exists (select 1 from public.listings l where l.id = listing_id and l.provider_id = auth.uid()));

create policy listing_locations_owner_delete on public.listing_locations
  for delete to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id and l.provider_id = auth.uid()));

create policy request_locations_participant_read on public.request_locations
  for select to anon, authenticated
  using (exists (
    select 1 from public.requests r
    where r.id = request_locations.request_id
      and (r.status = 'open' or r.requester_id = auth.uid())
  ));

create policy request_locations_owner_write on public.request_locations
  for insert to authenticated
  with check (
    exists (select 1 from public.requests r where r.id = request_id and r.requester_id = auth.uid())
    and exists (select 1 from public.sufu_locations sl where sl.id = location_id and sl.created_by = auth.uid())
  );

create policy request_locations_owner_update on public.request_locations
  for update to authenticated
  using (exists (select 1 from public.requests r where r.id = request_id and r.requester_id = auth.uid()))
  with check (exists (select 1 from public.requests r where r.id = request_id and r.requester_id = auth.uid()));

create policy request_locations_owner_delete on public.request_locations
  for delete to authenticated
  using (exists (select 1 from public.requests r where r.id = request_id and r.requester_id = auth.uid()));

comment on table public.sufu_countries is 'Global country registry; adding a market is configuration, not a marketplace rewrite.';
comment on table public.sufu_geography_nodes is 'Provider-neutral world geography hierarchy.';
comment on table public.sufu_locations is 'Reusable geographic assertions independent of device location.';
comment on table public.profile_locations is 'Person/business origin, operating and service geography.';
comment on table public.listing_locations is 'Supply, service, fulfilment and workplace geography.';
comment on table public.request_locations is 'Requester origin, target need and fulfilment geography.';
