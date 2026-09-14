-- SUFU C.14D: refund and provider-event reconciliation contracts.
-- These records are intentionally inert until trusted payment-provider workers are connected.

create table if not exists public.payment_refunds (
  id uuid primary key default gen_random_uuid(),
  payment_intent_id uuid not null references public.payment_intents(id) on delete restrict,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  reason text not null check (length(trim(reason)) between 2 and 500),
  status text not null default 'requested' check (status in ('requested','processing','succeeded','failed','cancelled')),
  provider text,
  provider_refund_id text,
  idempotency_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_reconciliation_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null unique,
  event_type text not null,
  payment_intent_id uuid references public.payment_intents(id) on delete restrict,
  provider_reference text,
  status text not null default 'received' check (status in ('received','processed','ignored','failed')),
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists payment_refunds_intent_idx on public.payment_refunds(payment_intent_id, created_at desc);
create index if not exists reconciliation_intent_idx on public.payment_reconciliation_events(payment_intent_id, received_at desc);

alter table public.payment_refunds enable row level security;
alter table public.payment_reconciliation_events enable row level security;

create policy refund_participant_read on public.payment_refunds
  for select to authenticated
  using (exists (
    select 1 from public.payment_intents pi
    where pi.id = payment_refunds.payment_intent_id
      and (pi.payer_id = auth.uid() or pi.payee_id = auth.uid())
  ));

-- Provider payloads are private operational data. No browser reads or writes.
revoke all on public.payment_reconciliation_events from anon, authenticated;
revoke insert, update, delete on public.payment_refunds from anon, authenticated;

comment on table public.payment_refunds is 'Refund lifecycle records; mutations belong to trusted payment infrastructure.';
comment on table public.payment_reconciliation_events is 'Deduplicated provider webhook/event ledger for asynchronous reconciliation.';
