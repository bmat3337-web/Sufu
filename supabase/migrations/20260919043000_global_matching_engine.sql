-- SUFU global matching foundation.
-- Match the economic target, not the requester's physical location.
-- Local, domestic, remote and cross-border requests use the same function.

create or replace function public.match_request_listings(p_request_id uuid)
returns table (
  listing_id uuid,
  match_score integer,
  match_reason text
)
language sql
stable
security invoker
set search_path = public
as $$
  with request_context as (
    select
      r.id,
      upper(r.target_country_code) as target_country,
      lower(coalesce(r.city,'')) as target_city,
      lower(coalesce(r.suburb,'')) as target_suburb,
      lower(coalesce(r.category,'')) as target_category,
      r.request_type
    from public.requests r
    where r.id = p_request_id
      and r.status = 'open'
  ),
  candidates as (
    select
      l.id,
      l.type,
      lower(coalesce(l.category,'')) as category,
      lower(coalesce(l.city,'')) as city,
      lower(coalesce(l.suburb,'')) as suburb,
      upper(coalesce(l.supply_country_code,'')) as supply_country,
      upper(coalesce(l.fulfilment_country_code,'')) as fulfilment_country,
      coalesce(l.remote,false) as remote
    from public.listings l
    where l.status = 'active'
  ),
  scored as (
    select
      c.id,
      (
        case when c.type = rc.request_type then 35 else 0 end +
        case when rc.target_category <> '' and c.category = rc.target_category then 20 else 0 end +
        case when c.supply_country = rc.target_country then 20 else 0 end +
        case when c.fulfilment_country = rc.target_country then 15 else 0 end +
        case when rc.target_city <> '' and c.city <> '' and lower(c.city) = rc.target_city then 20 else 0 end +
        case when rc.target_suburb <> '' and c.suburb <> '' and lower(c.suburb) = rc.target_suburb then 10 else 0 end +
        case when c.remote then 8 else 0 end +
        case when exists (
          select 1
          from public.listing_locations ll
          join public.sufu_locations sl on sl.id = ll.location_id
          where ll.listing_id = c.id
            and ll.role in ('service_area','fulfilment','supply','workplace')
            and upper(sl.country_code) = rc.target_country
        ) then 25 else 0 end +
        case when exists (
          select 1
          from public.listing_locations ll
          join public.sufu_locations sl on sl.id = ll.location_id
          where ll.listing_id = c.id
            and ll.role in ('service_area','fulfilment','supply','workplace')
            and upper(sl.country_code) = rc.target_country
            and rc.target_city <> ''
            and lower(coalesce(sl.city,'')) = rc.target_city
        ) then 30 else 0 end
      )::integer as score,
      rc
    from candidates c
    cross join request_context rc
    where
      c.remote
      or c.supply_country = rc.target_country
      or c.fulfilment_country = rc.target_country
      or exists (
        select 1
        from public.listing_locations ll
        join public.sufu_locations sl on sl.id = ll.location_id
        where ll.listing_id = c.id
          and ll.role in ('service_area','fulfilment','supply','workplace')
          and upper(sl.country_code) = rc.target_country
      )
  )
  select
    s.id,
    s.score,
    case
      when s.remote then 'Remote'
      when s.rc.target_city <> '' and lower(s.city) = s.rc.target_city then 'Target city'
      when s.supply_country = s.rc.target_country or s.fulfilment_country = s.rc.target_country then 'Target country'
      else 'Service or fulfilment area'
    end
  from scored s
  where s.score > 0
  order by s.score desc, s.id;
$$;

revoke all on function public.match_request_listings(uuid) from public;
grant execute on function public.match_request_listings(uuid) to anon, authenticated;

comment on function public.match_request_listings(uuid) is
  'Global SUFU matching: evaluates listing type, category, target country/city, service area, fulfilment and remote capability; requester origin is not used as a location constraint.';

create index if not exists listing_locations_match_country_idx
  on public.listing_locations(role, location_id, listing_id);

create index if not exists listings_global_match_idx
  on public.listings(status, type, supply_country_code, fulfilment_country_code, city);
