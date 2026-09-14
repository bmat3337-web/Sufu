-- SUFU C.16: trusted escrow lifecycle boundary.
-- Payment-provider settlement remains service-role owned. These RPCs only permit
-- state changes whose authorization can be established from the engagement parties.

create or replace function public.request_escrow_funding(p_engagement_id uuid, p_payment_intent_id uuid)
returns public.escrow_holds
language plpgsql security definer set search_path=public
as $$
declare v_eng public.engagements; v_pi public.payment_intents; v_hold public.escrow_holds;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_eng from public.engagements where id=p_engagement_id;
  if not found or v_eng.requester_id <> auth.uid() then raise exception 'NOT_REQUESTER'; end if;
  select * into v_pi from public.payment_intents where id=p_payment_intent_id;
  if not found or v_pi.source_type <> 'engagement' or v_pi.source_id <> p_engagement_id then raise exception 'PAYMENT_INTENT_MISMATCH'; end if;
  if v_pi.payer_id <> v_eng.requester_id or v_pi.payee_id <> v_eng.provider_id then raise exception 'PAYMENT_PARTIES_MISMATCH'; end if;
  if v_pi.status not in ('pending','requires_action','processing','succeeded') then raise exception 'PAYMENT_NOT_FUNDABLE'; end if;
  insert into public.escrow_holds(engagement_id,payer_id,payee_id,amount_minor,currency,status)
  values (p_engagement_id,v_eng.requester_id,v_eng.provider_id,v_pi.amount_minor,v_pi.currency,'pending')
  on conflict (engagement_id) do update set updated_at=now()
  returning * into v_hold;
  return v_hold;
end;
$$;

create or replace function public.release_escrow(p_engagement_id uuid)
returns public.escrow_holds
language plpgsql security definer set search_path=public
as $$
declare v_eng public.engagements; v_hold public.escrow_holds;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_eng from public.engagements where id=p_engagement_id;
  if not found or v_eng.requester_id <> auth.uid() then raise exception 'NOT_REQUESTER'; end if;
  if v_eng.status <> 'completed' then raise exception 'ENGAGEMENT_NOT_COMPLETED'; end if;
  select * into v_hold from public.escrow_holds where engagement_id=p_engagement_id for update;
  if not found then raise exception 'ESCROW_NOT_FOUND'; end if;
  if v_hold.status <> 'funded' then raise exception 'ESCROW_NOT_RELEASABLE'; end if;
  update public.escrow_holds set status='released',released_at=now(),updated_at=now() where id=v_hold.id returning * into v_hold;
  return v_hold;
end;
$$;

revoke all on function public.request_escrow_funding(uuid,uuid) from public;
revoke all on function public.release_escrow(uuid) from public;
grant execute on function public.request_escrow_funding(uuid,uuid) to authenticated;
grant execute on function public.release_escrow(uuid) to authenticated;

comment on function public.request_escrow_funding(uuid,uuid) is 'Creates an engagement escrow hold only after server-authoritative payment intent validation.';
comment on function public.release_escrow(uuid) is 'Requester-only release after server-authoritative engagement completion; actual payout remains trusted infrastructure.';
