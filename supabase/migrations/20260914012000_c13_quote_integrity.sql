-- SUFU C.13: quote acceptance integrity.
-- A quote can create an engagement only when its offer is the accepted offer
-- for the same matched request and participant identities agree.

create or replace function public.accept_quote(p_quote_id uuid)
returns public.engagements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote public.quotes;
  v_offer public.request_offers;
  v_request public.requests;
  v_engagement public.engagements;
begin
  select * into v_quote from public.quotes
  where id=p_quote_id and requester_id=auth.uid() and status='sent'
  for update;
  if v_quote.id is null then raise exception 'QUOTE_NOT_ELIGIBLE'; end if;

  select * into v_request from public.requests
  where id=v_quote.request_id
  for update;
  if v_request.id is null or v_request.requester_id <> auth.uid() or v_request.status <> 'matched' then
    raise exception 'QUOTE_REQUEST_NOT_ELIGIBLE';
  end if;

  select * into v_offer from public.request_offers
  where id=v_quote.offer_id
  for update;
  if v_offer.id is null
     or v_offer.request_id <> v_quote.request_id
     or v_offer.provider_id <> v_quote.provider_id
     or v_offer.status <> 'accepted' then
    raise exception 'QUOTE_OFFER_NOT_ELIGIBLE';
  end if;

  if exists(select 1 from public.engagements where request_id=v_quote.request_id) then
    raise exception 'REQUEST_ALREADY_ENGAGED';
  end if;

  update public.quotes
  set status='accepted', accepted_at=now(), updated_at=now()
  where id=v_quote.id
  returning * into v_quote;

  insert into public.engagements(
    request_id,offer_id,quote_id,requester_id,provider_id,
    agreed_amount,agreed_currency,agreed_title,agreed_scope,agreed_terms,status
  ) values(
    v_quote.request_id,v_quote.offer_id,v_quote.id,v_quote.requester_id,v_quote.provider_id,
    v_quote.amount,v_quote.currency,v_quote.title,v_quote.scope,v_quote.terms,'agreed'
  ) returning * into v_engagement;

  return v_engagement;
end;
$$;

revoke all on function public.accept_quote(uuid) from public;
grant execute on function public.accept_quote(uuid) to authenticated;

comment on function public.accept_quote(uuid) is 'C.13 requester-only quote acceptance with request, accepted-offer, and participant integrity checks.';
