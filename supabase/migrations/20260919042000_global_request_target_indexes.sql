-- Global request discovery indexes. Origin and target are separate economic dimensions.
create index if not exists requests_origin_country_idx
  on public.requests(origin_country_code, status, created_at desc);

create index if not exists requests_target_country_idx
  on public.requests(target_country_code, status, created_at desc);

create index if not exists requests_cross_border_status_idx
  on public.requests(cross_border, status, created_at desc);

-- Keep target-city discovery efficient during the compatibility period.
create index if not exists requests_target_city_idx
  on public.requests(target_country_code, city, status, created_at desc);

comment on column public.requests.origin_country_code is
  'Country where the requester is based; not necessarily the location of the need.';
comment on column public.requests.target_country_code is
  'Country where the requested economic activity/supply should be fulfilled.';
