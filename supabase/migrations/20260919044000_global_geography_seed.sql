-- Starter global city registry. The provider-neutral hierarchy is extensible;
-- this seed only makes the global model immediately useful for common launch flows.
with countries(code,name) as (
  values
    ('ZW','Zimbabwe'),('JP','Japan'),('CN','China'),('ZA','South Africa'),
    ('GB','United Kingdom'),('US','United States'),('KE','Kenya')
)
insert into public.sufu_geography_nodes(country_code, level, name, code, provider)
select code, 'country', name, code, 'sufu-seed'
from countries
where not exists (
  select 1 from public.sufu_geography_nodes g
  where g.country_code = countries.code and g.level = 'country' and g.name = countries.name
);

with cities(country_code,name,code,timezone) as (
  values
    ('ZW','Harare','ZW-HRE','Africa/Harare'),
    ('ZW','Bulawayo','ZW-BYO','Africa/Harare'),
    ('ZW','Mutare','ZW-MUT','Africa/Harare'),
    ('ZW','Gweru','ZW-GWE','Africa/Harare'),
    ('JP','Tokyo','JP-13','Asia/Tokyo'),
    ('JP','Osaka','JP-27','Asia/Tokyo'),
    ('JP','Yokohama','JP-14','Asia/Tokyo'),
    ('JP','Nagoya','JP-23','Asia/Tokyo'),
    ('CN','Shenzhen','CN-44','Asia/Shanghai'),
    ('CN','Shanghai','CN-31','Asia/Shanghai'),
    ('CN','Beijing','CN-11','Asia/Shanghai'),
    ('CN','Guangzhou','CN-44-GZ','Asia/Shanghai'),
    ('ZA','Johannesburg','ZA-GP-JNB','Africa/Johannesburg'),
    ('ZA','Cape Town','ZA-WC-CPT','Africa/Johannesburg'),
    ('GB','London','GB-LND','Europe/London'),
    ('KE','Nairobi','KE-30','Africa/Nairobi'),
    ('US','New York','US-NY-NYC','America/New_York'),
    ('US','Los Angeles','US-CA-LAX','America/Los_Angeles')
)
insert into public.sufu_geography_nodes(country_code, level, name, code, provider, timezone)
select c.country_code, 'city', c.name, c.code, 'sufu-seed', c.timezone
from cities c
where not exists (
  select 1 from public.sufu_geography_nodes g
  where g.country_code = c.country_code and g.level = 'city' and g.name = c.name
);

comment on table public.sufu_geography_nodes is
  'Provider-neutral global geography. Seeded launch cities are only starter coverage; production can add a full external geography provider without changing SUFU domain models.';
