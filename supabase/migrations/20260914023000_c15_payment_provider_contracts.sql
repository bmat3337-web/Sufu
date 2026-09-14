-- SUFU C.15: provider-neutral settlement contract.
-- This migration defines the trusted boundary; it does not connect a live provider.

create table if not exists public.payment_provider_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  provider text not null,
  provider_account_ref text not null,
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  status text not null default 'pending' check (status in ('pending','active','restricted','disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, provider_account_ref),
  unique(user_id, provider, currency)
);

create table if not exists public.payment_settlements (
  id uuid primary key default gen_random_uuid(),
  payment_intent_id uuid not null unique references public.payment_intents(id) on delete restrict,
  provider text not null,
  provider_transaction_id text not null,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'received' check (status in ('received','posted','failed','reversed')),
  received_at timestamptz not null default now(),
  posted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique(provider, provider_transaction_id)
);

alter table public.payment_provider_accounts enable row level security;
alter table public.payment_settlements enable row level security;

create policy provider_account_own_read on public.payment_provider_accounts
  for select to authenticated using (user_id = auth.uid());

-- Settlement records contain provider references and are trusted-server data.
revoke all on public.payment_settlements from anon, authenticated;
revoke insert, update, delete on public.payment_provider_accounts from anon, authenticated;

comment on table public.payment_provider_accounts is 'Provider identity references only; secrets and credentials remain outside the database.';
comment on table public.payment_settlements is 'Trusted provider settlement evidence, deduplicated by provider transaction id.';
