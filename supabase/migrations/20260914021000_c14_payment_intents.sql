-- SUFU C.14A: payment intent contract.
-- Client may create an intent only through the RPC below; settlement remains trusted-server/provider work.

create table if not exists public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('order','engagement')),
  source_id uuid not null,
  payer_id uuid not null references auth.users(id) on delete restrict,
  payee_id uuid not null references auth.users(id) on delete restrict,
  amount_minor bigint not null check (amount_minor > 0),
  platform_fee_minor bigint not null default 0 check (platform_fee_minor >= 0 and platform_fee_minor <= amount_minor),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'pending' check (status in ('pending','requires_action','processing','succeeded','failed','cancelled','refunded')),
  provider text,
  provider_intent_id text,
  idempotency_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (payer_id <> payee_id)
);

create index if not exists payment_intents_source_idx on public.payment_intents(source_type, source_id);
create index if not exists payment_intents_payer_idx on public.payment_intents(payer_id, created_at desc);
create index if not exists payment_intents_payee_idx on public.payment_intents(payee_id, created_at desc);

alter table public.payment_intents enable row level security;
create policy payment_intents_participant_read on public.payment_intents
  for select to authenticated using (payer_id = auth.uid() or payee_id = auth.uid());
revoke insert, update, delete on public.payment_intents from anon, authenticated;

create or replace function public.create_payment_intent(p_source_type text, p_source_id uuid, p_idempotency_key text)
returns public.payment_intents
language plpgsql
security definer
set search_path=public
as $$
declare
  v_existing public.payment_intents;
  v_payer uuid := auth.uid();
  v_payee uuid;
  v_amount bigint;
  v_fee bigint := 0;
  v_currency text;
  v_result public.payment_intents;
begin
  if v_payer is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_source_type not in ('order','engagement') then raise exception 'INVALID_SOURCE_TYPE'; end if;
  if coalesce(length(trim(p_idempotency_key)),0) < 8 then raise exception 'INVALID_IDEMPOTENCY_KEY'; end if;

  select * into v_existing from public.payment_intents
    where idempotency_key = p_idempotency_key;
  if found then
    if v_existing.payer_id <> v_payer then raise exception 'IDEMPOTENCY_KEY_OWNED_BY_OTHER_USER'; end if;
    return v_existing;
  end if;

  if p_source_type = 'order' then
    select o.seller_id, o.amount_minor, o.platform_fee_minor, upper(o.currency)
      into v_payee, v_amount, v_fee, v_currency
    from public.orders o
    where o.id = p_source_id and o.buyer_id = v_payer and o.status = 'pending';
    if v_payee is null then raise exception 'ORDER_NOT_PAYABLE'; end if;
  else
    select e.provider_id, (e.agreed_amount * 100)::bigint, upper(e.agreed_currency)
      into v_payee, v_amount, v_currency
    from public.engagements e
    where e.id = p_source_id
      and e.requester_id = v_payer
      and e.status in ('agreed','in_progress');
    if v_payee is null then raise exception 'ENGAGEMENT_NOT_PAYABLE'; end if;
  end if;

  insert into public.payment_intents(source_type,source_id,payer_id,payee_id,amount_minor,platform_fee_minor,currency,idempotency_key)
  values (p_source_type,p_source_id,v_payer,v_payee,v_amount,coalesce(v_fee,0),v_currency,p_idempotency_key)
  returning * into v_result;
  return v_result;
end;
$$;

revoke all on function public.create_payment_intent(text,uuid,text) from public;
grant execute on function public.create_payment_intent(text,uuid,text) to authenticated;

comment on table public.payment_intents is 'Server-authoritative payment instructions. Amount, parties and currency are derived from the economic source; clients cannot settle or mutate intents.';
