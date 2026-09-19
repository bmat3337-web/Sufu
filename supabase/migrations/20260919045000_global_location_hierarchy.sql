-- Global hierarchy helpers. Parent-child relations are canonical;
-- city text remains a compatibility projection for existing marketplace data.

create index if not exists sufu_geo_country_level_name_idx
  on public.sufu_geography_nodes(country_code, level, lower(name));

create index if not exists sufu_geo_parent_level_name_idx
  on public.sufu_geography_nodes(parent_id, level, lower(name));

create or replace function public.global_city_options(p_country_code text)
returns table (
  id uuid,
  country_code text,
  name text,
  code text,
  timezone text
)
language sql
stable
security invoker
set search_path = public
as $$
  select g.id, g.country_code, g.name, g.code, g.timezone
  from public.sufu_geography_nodes g
  where g.country_code = upper(p_country_code)
    and g.level = 'city'
  order by g.name;
$$;

grant execute on function public.global_city_options(text) to anon, authenticated;

comment on function public.global_city_options(text) is
  'Provider-neutral country-to-city lookup used by SUFU location selection.';
