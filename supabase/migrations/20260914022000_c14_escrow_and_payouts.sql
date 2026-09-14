-- SUFU C.14B: custody and payout records.
-- These tables are intentionally mutation-locked for clients. Trusted settlement code owns state changes.

create table if not exists public.escrow_holds (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null unique references public.engagements(id) on delete restrict,
  payer_id uuid not null references auth.users(id) on delete restrict,
  payee_id uuid not null references auth.users(id) on delete restrict,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'pending' check (status in ('pending','funded','released','refunded','disputed','cancelled')),
  funded_at timestamptz,
  released_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (payer_id <> payee_id)
);

create index if not exists escrow_holds_payer_idx on public.escrow_holds(payer_id, created_at desc);
create index if not exists escrow_holds_payee_idx on public.escrow_holds(payee_id, created_at desc);

create table if not exists public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  payee_id uuid not null references auth.users(id) on delete restrict,
  engagement_id uuid references public.engagements(id) on delete restrict,
  escrow_hold_id uuid references public.escrow_holds(id) on delete restrict,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  destination_type text not null,
  status text not null default 'pending' check (status in ('pending','processing','paid','failed','cancelled')),
  provider text,
  provider_payout_id text,
  idempotency_key text not null unique,
  failure_code text,
  failure_message text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists payout_requests_payee_idx on public.payout_requests(payee_id, created_at desc);

alter table public.escrow_holds enable row level security;
alter table public.payout_requests enable row level security;

create policy escrow_participant_read on public.escrow_holds
  for select to authenticated using (payer_id = auth.uid() or payee_id = auth.uid());
create policy payout_owner_read on public.payout_requests
  for select to authenticated using (payee_id = auth.uid());

revoke insert, update, delete on public.escrow_holds from anon, authenticated;
revoke insert, update, delete on public.payout_requests from anon, authenticated;
revoke all on public.escrow_holds from anon;
revoke all on public.payout_requests from anon;

comment on table public.escrow_holds is 'Engagement-linked custody state. Funding, release, refund and dispute transitions are trusted-server operations.';
comment on table public.payout_requests is 'Provider payout instructions. Creation and status transitions are trusted-server operations.';
