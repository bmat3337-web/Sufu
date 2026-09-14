-- SUFU C.15C: provider/rail registry.
-- Configuration only. Secrets, signing keys and credentials stay in server-side secret storage.

create table if not exists public.payment_rails (
  id uuid primary key default gen_random_uuid(),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  provider text not null,
  rail_type text not null check (rail_type in ('card','bank','mobile_money','wallet','other')),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  enabled boolean not null default false,
  supports_collection boolean not null default false,
  supports_payout boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(country_code, provider, rail_type, currency)
);

alter table public.payment_rails enable row level security;
create policy payment_rails_public_read on public.payment_rails
  for select to anon, authenticated using (enabled = true);
revoke insert, update, delete on public.payment_rails from anon, authenticated;

insert into public.payment_rails(country_code,provider,rail_type,currency,enabled,supports_collection,supports_payout)
values ('ZW','pending','other','USD',false,false,false)
on conflict (country_code,provider,rail_type,currency) do nothing;

comment on table public.payment_rails is 'Provider-neutral payment rail configuration. Disabled until a reviewed production adapter is installed.';
