-- SUFU backend reconstruction / integrity patch
-- Restores the database surface required by src/lib/api.ts and the live
-- security gate. Apply after 20260905041310_sufu_schema_v1.sql.

-- ---------------------------------------------------------------------------
-- 0. Complete the truncated v1 schema before adding dependent objects.
-- ---------------------------------------------------------------------------
create policy provider_services_update_own on public.provider_services
  for update to authenticated
  using (provider_id = auth.uid())
  with check (provider_id = auth.uid());
create policy provider_services_delete_own on public.provider_services
  for delete to authenticated
  using (provider_id = auth.uid());

create policy portfolio_items_select on public.portfolio_items
  for select to anon, authenticated using (true);
create policy portfolio_items_insert on public.portfolio_items
  for insert to authenticated with check (provider_id = auth.uid());
create policy portfolio_items_update_own on public.portfolio_items
  for update to authenticated
  using (provider_id = auth.uid())
  with check (provider_id = auth.uid());
create policy portfolio_items_delete_own on public.portfolio_items
  for delete to authenticated using (provider_id = auth.uid());

create policy reviews_select on public.reviews
  for select to anon, authenticated using (true);
create policy reviews_insert on public.reviews
  for insert to authenticated
  with check (author_id = auth.uid() and provider_id <> auth.uid());
create policy reviews_update_own on public.reviews
  for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid() and provider_id <> auth.uid());
create policy reviews_delete_own on public.reviews
  for delete to authenticated using (author_id = auth.uid());

create policy conversations_select_participant on public.conversations
  for select to authenticated
  using (user_a = auth.uid() or user_b = auth.uid());

create policy messages_select_participant on public.messages
  for select to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid())
  ));
create policy messages_insert_sender_participant on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );
create policy messages_update_received on public.messages
  for update to authenticated
  using (
    sender_id <> auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  )
  with check (sender_id <> auth.uid());

create policy saved_listings_select_own on public.saved_listings
  for select to authenticated using (profile_id = auth.uid());
create policy saved_listings_insert_own on public.saved_listings
  for insert to authenticated with check (profile_id = auth.uid());
create policy saved_listings_delete_own on public.saved_listings
  for delete to authenticated using (profile_id = auth.uid());

create policy applications_select_applicant_or_owner on public.applications
  for select to authenticated
  using (
    applicant_id = auth.uid()
    or exists (
      select 1 from public.listings l
      where l.id = listing_id and l.provider_id = auth.uid()
    )
  );
create policy applications_insert_applicant on public.applications
  for insert to authenticated
  with check (
    applicant_id = auth.uid()
    and exists (
      select 1 from public.listings l
      where l.id = listing_id and l.type = 'job' and l.provider_id <> auth.uid() and l.status = 'active'
    )
    and status = 'pending'
  );

create policy reports_insert_own on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());
create policy reports_select_own on public.reports
  for select to authenticated using (reporter_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 1. Privilege boundary: the browser cannot mutate server-authoritative data.
-- ---------------------------------------------------------------------------
revoke insert (views, featured) on public.listings from anon, authenticated;
revoke update (views, featured) on public.listings from anon, authenticated;
revoke delete on public.orders from anon, authenticated;

revoke insert (
  verified_phone, verified_email, verified_identity, verified_business,
  rating, review_count, completed_jobs
) on public.profiles from anon, authenticated;
revoke update (
  verified_phone, verified_email, verified_identity, verified_business,
  rating, review_count, completed_jobs
) on public.profiles from anon, authenticated;

-- The browser never creates conversations directly; pair normalization is RPC-only.
revoke insert, update, delete on public.conversations from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Profile bootstrap + review aggregates.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1), 'SUFU member')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to service_role;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.refresh_provider_rating(p_provider_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles p
  set rating = coalesce((select round(avg(r.rating)::numeric, 1) from public.reviews r where r.provider_id = p_provider_id), 0),
      review_count = (select count(*) from public.reviews r where r.provider_id = p_provider_id)
  where p.id = p_provider_id;
end;
$$;

create or replace function public.reviews_refresh_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_provider_rating(old.provider_id);
  elsif tg_op = 'UPDATE' then
    perform public.refresh_provider_rating(old.provider_id);
    perform public.refresh_provider_rating(new.provider_id);
  else
    perform public.refresh_provider_rating(new.provider_id);
  end if;
  return coalesce(new, old);
end;
$$;

revoke all on function public.refresh_provider_rating(uuid) from public, anon, authenticated;
grant execute on function public.refresh_provider_rating(uuid) to service_role;
revoke all on function public.reviews_refresh_rating() from public, anon, authenticated;

drop trigger if exists reviews_refresh_rating on public.reviews;
create trigger reviews_refresh_rating
after insert or update or delete on public.reviews
for each row execute function public.reviews_refresh_rating();

-- ---------------------------------------------------------------------------
-- 3. Messaging RPCs.
-- ---------------------------------------------------------------------------
create or replace function public.get_or_create_conversation(p_listing_id uuid, p_other_id uuid)
returns public.conversations
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  a uuid;
  b uuid;
  result public.conversations;
begin
  if me is null then raise exception 'authentication required'; end if;
  if p_other_id is null or p_other_id = me then raise exception 'invalid conversation participant'; end if;
  if not exists (select 1 from public.profiles where id = p_other_id) then raise exception 'participant not found'; end if;

  if me < p_other_id then a := me; b := p_other_id; else a := p_other_id; b := me; end if;

  select * into result from public.conversations
  where user_a = a and user_b = b and listing_id is not distinct from p_listing_id
  limit 1;

  if result.id is null then
    insert into public.conversations (listing_id, user_a, user_b)
    values (p_listing_id, a, b)
    on conflict (user_a, user_b, listing_id) do update set updated_at = now()
    returning * into result;
  end if;
  return result;
end;
$$;

grant execute on function public.get_or_create_conversation(uuid, uuid) to authenticated;

create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations set updated_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;
revoke all on function public.touch_conversation() from public, anon, authenticated;

drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation
after insert on public.messages
for each row execute function public.touch_conversation();

-- ---------------------------------------------------------------------------
-- 4. Views RPC.
-- ---------------------------------------------------------------------------
create or replace function public.increment_views(p_listing_id uuid, p_viewer_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_listing_id is null then return; end if;
  if p_viewer_id is not null and exists (
    select 1 from public.listings where id = p_listing_id and provider_id = p_viewer_id
  ) then return; end if;
  update public.listings
  set views = views + 1
  where id = p_listing_id and status = 'active';
end;
$$;
grant execute on function public.increment_views(uuid, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Search RPC.
-- ---------------------------------------------------------------------------
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
    and (filters->>'city' is null or filters->>'city' = '' or l.city = filters->>'city')
    and (filters->>'suburb' is null or filters->>'suburb' = '' or l.suburb = filters->>'suburb')
  order by
    case when coalesce(filters->>'sort','newest') = 'price-asc' then l.price end asc nulls last,
    case when coalesce(filters->>'sort','newest') = 'price-desc' then l.price end desc nulls last,
    case when coalesce(filters->>'sort','newest') = 'rating' then p.rating end desc nulls last,
    case when coalesce(filters->>'sort','newest') = 'newest' then l.posted_at end desc,
    l.posted_at desc
  limit least(greatest(coalesce((filters->>'limit')::int, 100), 1), 100)
  offset greatest(coalesce((filters->>'offset')::int, 0), 0);
$$;
grant execute on function public.search_listings(jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Application-status RPC.
-- ---------------------------------------------------------------------------
create or replace function public.update_application_status(
  p_application_id uuid,
  p_status text
)
returns public.applications
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.applications;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_status not in ('shortlisted','accepted','declined') then raise exception 'invalid application status'; end if;

  update public.applications a
  set status = p_status
  where a.id = p_application_id
    and exists (
      select 1 from public.listings l
      where l.id = a.listing_id and l.provider_id = auth.uid()
    )
  returning a.* into result;

  if result.id is null then raise exception 'application not found or not authorized'; end if;
  return result;
end;
$$;
grant execute on function public.update_application_status(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Commerce foundation.
-- ---------------------------------------------------------------------------
create table if not exists public.commerce_config (
  key text primary key,
  value jsonb not null
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete restrict,
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  seller_id uuid not null references public.profiles(id) on delete restrict,
  amount_minor bigint not null check (amount_minor >= 0),
  platform_fee_minor bigint not null check (platform_fee_minor >= 0),
  currency text not null default 'USD',
  status text not null default 'pending' check (status in ('pending','paid','completed','cancelled','refunded')),
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  grantee_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('unlocked_conversation','featured_promotion','verified_listing')),
  granted_at timestamptz not null default now(),
  unique(order_id, grantee_id, kind)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  provider text not null,
  provider_event_id text not null unique,
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null default 'USD',
  status text not null default 'received',
  payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.commerce_config enable row level security;
alter table public.orders enable row level security;
alter table public.entitlements enable row level security;
alter table public.payments enable row level security;

create policy commerce_config_select on public.commerce_config
  for select to anon, authenticated using (true);
create policy orders_select_party on public.orders
  for select to authenticated using (buyer_id = auth.uid() or seller_id = auth.uid());
create policy entitlements_select_grantee on public.entitlements
  for select to authenticated using (grantee_id = auth.uid());

-- No client policies for payment events; service role only.

insert into public.commerce_config(key, value)
values ('platform_fee_rate', '0.05'::jsonb), ('currency', '"USD"'::jsonb)
on conflict (key) do nothing;

create or replace function public.create_order(p_listing_id uuid, p_idempotency_key text default null)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  listing_row public.listings;
  result public.orders;
  buyer uuid := auth.uid();
  fee_rate numeric := 0.05;
  amount_minor bigint;
  fee_minor bigint;
begin
  if buyer is null then raise exception 'authentication required'; end if;
  if p_idempotency_key is not null then
    select * into result from public.orders where idempotency_key = p_idempotency_key;
    if result.id is not null then raise exception 'duplicate idempotency key'; end if;
  end if;

  select * into listing_row
  from public.listings
  where id = p_listing_id and status = 'active'
  for update;
  if listing_row.id is null then raise exception 'listing not available'; end if;
  if listing_row.provider_id = buyer then raise exception 'cannot purchase your own listing'; end if;
  if listing_row.price is null then raise exception 'listing has no purchase price'; end if;

  select coalesce((value #>> '{}')::numeric, 0.05)
  into fee_rate from public.commerce_config where key = 'platform_fee_rate';
  amount_minor := round(listing_row.price * 100);
  fee_minor := round(amount_minor * fee_rate);

  insert into public.orders (listing_id, buyer_id, seller_id, amount_minor, platform_fee_minor, currency, status, idempotency_key)
  values (listing_row.id, buyer, listing_row.provider_id, amount_minor, fee_minor, 'USD', 'pending', p_idempotency_key)
  returning * into result;
  return result;
exception when unique_violation then
  raise exception 'duplicate idempotency key';
end;
$$;
grant execute on function public.create_order(uuid, text) to authenticated;

create or replace function public.record_payment_event(
  p_provider text,
  p_provider_event_id text,
  p_amount_minor bigint
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare result public.payments;
begin
  insert into public.payments(provider, provider_event_id, amount_minor)
  values (p_provider, p_provider_event_id, p_amount_minor)
  returning * into result;
  return result;
end;
$$;
revoke execute on function public.record_payment_event(text, text, bigint) from public, anon, authenticated;
grant execute on function public.record_payment_event(text, text, bigint) to service_role;

-- ---------------------------------------------------------------------------
-- 8. Indexes required by the query/RLS paths.
-- ---------------------------------------------------------------------------
create index if not exists listings_provider_idx on public.listings(provider_id);
create index if not exists listings_status_type_posted_idx on public.listings(status, type, posted_at desc);
create index if not exists listings_city_suburb_idx on public.listings(city, suburb);
create index if not exists listings_search_trgm_idx on public.listings using gin ((title || ' ' || description) gin_trgm_ops);
create index if not exists profiles_business_rating_idx on public.profiles(is_business, rating desc);
create index if not exists provider_services_provider_idx on public.provider_services(provider_id);
create index if not exists portfolio_items_provider_idx on public.portfolio_items(provider_id);
create index if not exists reviews_provider_created_idx on public.reviews(provider_id, created_at desc);
create index if not exists conversations_user_a_idx on public.conversations(user_a, updated_at desc);
create index if not exists conversations_user_b_idx on public.conversations(user_b, updated_at desc);
create index if not exists messages_conversation_created_idx on public.messages(conversation_id, created_at asc);
create index if not exists saved_listings_profile_saved_idx on public.saved_listings(profile_id, saved_at desc);
create index if not exists applications_applicant_created_idx on public.applications(applicant_id, created_at desc);
create index if not exists applications_listing_created_idx on public.applications(listing_id, created_at desc);
create index if not exists orders_buyer_created_idx on public.orders(buyer_id, created_at desc);
create index if not exists orders_seller_created_idx on public.orders(seller_id, created_at desc);
create index if not exists entitlements_grantee_created_idx on public.entitlements(grantee_id, granted_at desc);

-- ---------------------------------------------------------------------------
-- 9. Explicitly keep privileged commerce tables/functions outside client write.
-- ---------------------------------------------------------------------------
revoke all on public.payments from anon, authenticated;
revoke insert, update, delete on public.orders from anon, authenticated;
revoke insert, update, delete on public.entitlements from anon, authenticated;
revoke insert, update, delete on public.commerce_config from anon, authenticated;
