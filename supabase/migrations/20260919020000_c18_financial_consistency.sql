-- SUFU C.18: financial consistency and trusted settlement boundary.
-- Client-side payment intents never imply custody. Only trusted settlement can
-- move a payment to succeeded and an engagement escrow hold to funded.

create or replace function public.create_payment_intent(
  p_source_type text,
  p_source_id uuid,
  p_idempotency_key text
)
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

  select * into v_existing
  from public.payment_intents
  where idempotency_key = p_idempotency_key;

  if found then
    if v_existing.payer_id <> v_payer then raise exception 'IDEMPOTENCY_KEY_OWNED_BY_OTHER_USER'; end if;
    if v_existing.source_type <> p_source_type or v_existing.source_id <> p_source_id then
      raise exception 'IDEMPOTENCY_KEY_SOURCE_MISMATCH';
    end if;
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

  if v_amount is null or v_amount <= 0 then raise exception 'INVALID_PAYMENT_AMOUNT'; end if;

  insert into public.payment_intents(
    source_type,source_id,payer_id,payee_id,amount_minor,platform_fee_minor,currency,idempotency_key
  )
  values (
    p_source_type,p_source_id,v_payer,v_payee,v_amount,coalesce(v_fee,0),v_currency,p_idempotency_key
  )
  returning * into v_result;

  return v_result;
end;
$$;

revoke all on function public.create_payment_intent(text,uuid,text) from public;
grant execute on function public.create_payment_intent(text,uuid,text) to authenticated;

create or replace function public.request_escrow_funding(
  p_engagement_id uuid,
  p_payment_intent_id uuid
)
returns public.escrow_holds
language plpgsql security definer set search_path=public
as $$
declare
  v_eng public.engagements;
  v_pi public.payment_intents;
  v_hold public.escrow_holds;
  v_expected_amount bigint;
  v_expected_currency text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_eng from public.engagements where id = p_engagement_id;
  if not found or v_eng.requester_id <> auth.uid() then raise exception 'NOT_REQUESTER'; end if;
  if v_eng.status not in ('agreed','in_progress') then raise exception 'ENGAGEMENT_NOT_FUNDABLE'; end if;

  select * into v_pi from public.payment_intents where id = p_payment_intent_id;
  if not found or v_pi.source_type <> 'engagement' or v_pi.source_id <> p_engagement_id then
    raise exception 'PAYMENT_INTENT_MISMATCH';
  end if;
  if v_pi.payer_id <> v_eng.requester_id or v_pi.payee_id <> v_eng.provider_id then
    raise exception 'PAYMENT_PARTIES_MISMATCH';
  end if;

  v_expected_amount := (v_eng.agreed_amount * 100)::bigint;
  v_expected_currency := upper(v_eng.agreed_currency);
  if v_pi.amount_minor <> v_expected_amount or upper(v_pi.currency) <> v_expected_currency then
    raise exception 'PAYMENT_AMOUNT_MISMATCH';
  end if;
  if v_pi.status not in ('pending','requires_action','processing','succeeded') then
    raise exception 'PAYMENT_NOT_FUNDABLE';
  end if;

  insert into public.escrow_holds(
    engagement_id,payer_id,payee_id,amount_minor,currency,status
  )
  values (
    p_engagement_id,v_eng.requester_id,v_eng.provider_id,v_pi.amount_minor,v_pi.currency,'pending'
  )
  on conflict (engagement_id) do update
    set payer_id=excluded.payer_id,
        payee_id=excluded.payee_id,
        amount_minor=excluded.amount_minor,
        currency=excluded.currency,
        updated_at=now()
  returning * into v_hold;

  return v_hold;
end;
$$;

revoke all on function public.request_escrow_funding(uuid,uuid) from public;
grant execute on function public.request_escrow_funding(uuid,uuid) to authenticated;

-- Trusted provider settlement entry point.
-- The provider worker supplies the provider event id, so webhook retries are
-- harmless. A successful, amount-matched engagement payment funds its pending
-- escrow atomically in the same transaction.
create or replace function public.apply_payment_settlement(
  p_payment_intent_id uuid,
  p_provider text,
  p_provider_event_id text,
  p_event_type text,
  p_status text,
  p_provider_intent_id text,
  p_amount_minor bigint,
  p_currency text
)
returns public.payment_intents
language plpgsql security definer set search_path=public
as $$
declare
  v_pi public.payment_intents;
  v_hold public.escrow_holds;
  v_event public.payment_reconciliation_events;
begin
  if coalesce(length(trim(p_provider)),0) < 2 then
    raise exception 'INVALID_PROVIDER';
  end if;
  if p_provider_event_id is null or length(trim(p_provider_event_id)) < 3 then
    raise exception 'INVALID_PROVIDER_EVENT_ID';
  end if;
  if p_status not in ('processing','succeeded','failed','cancelled','refunded') then
    raise exception 'INVALID_SETTLEMENT_STATUS';
  end if;

  select * into v_pi from public.payment_intents where id=p_payment_intent_id for update;
  if not found then raise exception 'PAYMENT_INTENT_NOT_FOUND'; end if;
  if p_amount_minor <> v_pi.amount_minor or upper(p_currency) <> upper(v_pi.currency) then
    raise exception 'SETTLEMENT_AMOUNT_MISMATCH';
  end if;
  if p_status = 'processing' and v_pi.status in ('succeeded','failed','cancelled','refunded') then
    raise exception 'INVALID_PAYMENT_STATE_TRANSITION';
  end if;
  if p_status = 'succeeded' and v_pi.status in ('failed','cancelled','refunded') then
    raise exception 'INVALID_PAYMENT_STATE_TRANSITION';
  end if;
  if p_status = 'failed' and v_pi.status in ('succeeded','refunded') then
    raise exception 'INVALID_PAYMENT_STATE_TRANSITION';
  end if;
  if p_status = 'cancelled' and v_pi.status in ('succeeded','refunded') then
    raise exception 'INVALID_PAYMENT_STATE_TRANSITION';
  end if;
  if p_status = 'refunded' and v_pi.status not in ('succeeded','refunded') then
    raise exception 'INVALID_REFUND_STATE_TRANSITION';
  end if;

  insert into public.payment_reconciliation_events(
    provider,provider_event_id,event_type,payment_intent_id,provider_reference,status
  )
  values (
    p_provider,p_provider_event_id,p_event_type,p_payment_intent_id,p_provider_intent_id,'received'
  )
  on conflict (provider_event_id) do nothing
  returning * into v_event;

  if v_event.id is null then
    return v_pi;
  end if;

  if p_status in ('succeeded','refunded') then
    insert into public.payment_settlements(
      payment_intent_id, provider, provider_transaction_id, amount_minor, currency, status, posted_at
    )
    values (
      p_payment_intent_id, p_provider, coalesce(p_provider_intent_id, p_provider_event_id),
      p_amount_minor, upper(p_currency), case when p_status='succeeded' then 'posted' else 'reversed' end, now()
    )
    on conflict (payment_intent_id) do update
      set provider=excluded.provider,
          provider_transaction_id=excluded.provider_transaction_id,
          amount_minor=excluded.amount_minor,
          currency=excluded.currency,
          status=excluded.status,
          posted_at=excluded.posted_at;
  end if;

  update public.payment_intents
    set status=p_status,
        provider=p_provider,
        provider_intent_id=coalesce(p_provider_intent_id,provider_intent_id),
        updated_at=now()
  where id=p_payment_intent_id
  returning * into v_pi;

  if p_status = 'refunded' and v_pi.source_type='engagement' then
    select * into v_hold
    from public.escrow_holds
    where engagement_id=v_pi.source_id
    for update;
    if found then
      if v_hold.status='released' then
        raise exception 'ESCROW_ALREADY_RELEASED';
      end if;
      if v_hold.status in ('pending','funded') then
        update public.escrow_holds
          set status='refunded', refunded_at=now(), updated_at=now()
        where id=v_hold.id;
      end if;
    end if;
  end if;

  if p_status = 'succeeded' and v_pi.source_type='engagement' then
    select * into v_hold
    from public.escrow_holds
    where engagement_id=v_pi.source_id
    for update;

    if found then
      if v_hold.amount_minor <> v_pi.amount_minor or upper(v_hold.currency) <> upper(v_pi.currency) then
        raise exception 'ESCROW_AMOUNT_MISMATCH';
      end if;
      if v_hold.status='pending' then
        update public.escrow_holds
          set status='funded', funded_at=now(), updated_at=now()
        where id=v_hold.id;
      end if;
    end if;
  end if;

  update public.payment_reconciliation_events
    set status='processed', processed_at=now()
  where id=v_event.id;

  return v_pi;
end;
$$;

revoke all on function public.apply_payment_settlement(uuid,text,text,text,text,text,bigint,text) from public;
grant execute on function public.apply_payment_settlement(uuid,text,text,text,text,text,bigint,text) to service_role;

comment on function public.apply_payment_settlement(uuid,text,text,text,text,text,bigint,text)
  is 'Trusted provider settlement boundary. Idempotently records provider events, updates payment intent state, and funds matching engagement escrow only on a verified succeeded settlement.';
