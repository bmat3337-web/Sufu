-- SUFU C.14C: immutable double-entry accounting primitives.
-- Positive postings are credits; negative postings are debits. Every entry must sum to zero.

create table if not exists public.financial_ledger_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete restrict,
  account_type text not null check (account_type in ('user','platform','escrow','fees','clearing')),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'active' check (status in ('active','frozen','closed')),
  created_at timestamptz not null default now(),
  unique(owner_id, account_type, currency)
);

create table if not exists public.financial_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  reference_type text not null,
  reference_id uuid,
  idempotency_key text not null unique,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.financial_ledger_postings (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.financial_ledger_entries(id) on delete restrict,
  account_id uuid not null references public.financial_ledger_accounts(id) on delete restrict,
  amount_minor bigint not null check (amount_minor <> 0),
  created_at timestamptz not null default now()
);

create index if not exists financial_ledger_entries_reference_idx on public.financial_ledger_entries(reference_type, reference_id);
create index if not exists financial_ledger_postings_entry_idx on public.financial_ledger_postings(entry_id);
create index if not exists financial_ledger_postings_account_idx on public.financial_ledger_postings(account_id, created_at desc);

alter table public.financial_ledger_accounts enable row level security;
alter table public.financial_ledger_entries enable row level security;
alter table public.financial_ledger_postings enable row level security;

create policy ledger_account_own_read on public.financial_ledger_accounts
  for select to authenticated using (owner_id = auth.uid());

revoke insert, update, delete on public.financial_ledger_accounts from anon, authenticated;
revoke all on public.financial_ledger_entries from anon, authenticated;
revoke all on public.financial_ledger_postings from anon, authenticated;

create or replace function public.assert_ledger_entry_balanced(p_entry_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_sum bigint;
begin
  select coalesce(sum(amount_minor),0) into v_sum
  from public.financial_ledger_postings
  where entry_id = p_entry_id;
  if v_sum <> 0 then raise exception 'LEDGER_UNBALANCED'; end if;
end;
$$;

revoke all on function public.assert_ledger_entry_balanced(uuid) from public;

comment on table public.financial_ledger_accounts is 'Derived-account model for user balances and platform/escrow clearing accounts.';
comment on table public.financial_ledger_entries is 'Immutable accounting transaction headers keyed for idempotent posting.';
comment on table public.financial_ledger_postings is 'Immutable signed postings. Each transaction must balance to zero.';
