-- Atomic acceptance for request offers. Only the request owner can accept.
-- The row lock prevents two concurrent acceptances for the same request.
create or replace function public.accept_request_offer(p_offer_id uuid)
returns table (request_id uuid, provider_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id uuid;
  v_provider_id uuid;
begin
  select ro.request_id, ro.provider_id
    into v_request_id, v_provider_id
  from public.request_offers ro
  join public.requests r on r.id = ro.request_id
  where ro.id = p_offer_id
    and r.requester_id = auth.uid()
    and r.status = 'open'
    and ro.status = 'pending'
  for update of ro, r;

  if v_request_id is null then
    raise exception 'OFFER_NOT_ELIGIBLE';
  end if;

  update public.request_offers
    set status = 'accepted', updated_at = now()
    where id = p_offer_id;

  update public.request_offers
    set status = 'declined', updated_at = now()
    where request_offers.request_id = v_request_id
      and request_offers.id <> p_offer_id
      and request_offers.status = 'pending';

  update public.requests
    set status = 'matched', updated_at = now()
    where id = v_request_id;

  return query select v_request_id, v_provider_id;
end;
$$;

revoke all on function public.accept_request_offer(uuid) from public;
grant execute on function public.accept_request_offer(uuid) to authenticated;

-- Status changes are server-authoritative. Providers may withdraw their own
-- pending offers; request owners may decline pending offers. Acceptance is RPC-only.
drop policy if exists "offers_participant_update" on public.request_offers;
drop policy if exists "offers_provider_withdraw" on public.request_offers;
create policy "offers_provider_withdraw" on public.request_offers
  for update using (provider_id = auth.uid() and status = 'pending')
  with check (provider_id = auth.uid() and status = 'withdrawn');

drop policy if exists "offers_requester_decline" on public.request_offers;
create policy "offers_requester_decline" on public.request_offers
  for update using (
    status = 'pending' and exists (
      select 1 from public.requests r where r.id = request_offers.request_id and r.requester_id = auth.uid()
    )
  )
  with check (
    status = 'declined' and exists (
      select 1 from public.requests r where r.id = request_offers.request_id and r.requester_id = auth.uid()
    )
  );
