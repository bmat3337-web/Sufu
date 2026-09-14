-- SUFU C.8: transaction/engagement state machine without payment custody.
create table if not exists public.engagements (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete restrict,
  offer_id uuid not null references public.request_offers(id) on delete restrict,
  quote_id uuid not null unique references public.quotes(id) on delete restrict,
  requester_id uuid not null references auth.users(id) on delete restrict,
  provider_id uuid not null references auth.users(id) on delete restrict,
  agreed_amount numeric(14,2) not null check (agreed_amount >= 0),
  agreed_currency text not null check (agreed_currency ~ '^[A-Z]{3}$'),
  agreed_scope text not null,
  agreed_terms text,
  status text not null default 'agreed' check (status in ('proposed','agreed','in_progress','completed','cancelled','disputed')),
  agreed_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint engagement_participants_distinct check (requester_id <> provider_id),
  constraint engagement_completion_consistent check ((status = 'completed') = (completed_at is not null))
);

create unique index if not exists one_active_engagement_per_request
  on public.engagements (request_id)
  where status in ('proposed','agreed','in_progress','disputed');

alter table public.engagements enable row level security;
create policy "engagement_participant_read" on public.engagements
  for select using (requester_id = auth.uid() or provider_id = auth.uid());

-- No direct client insert: accepted quote creates the immutable commercial snapshot.
create or replace function public.accept_quote(p_quote_id uuid)
returns public.quotes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote public.quotes;
  v_offer public.request_offers;
  v_request public.requests;
  v_engagement_id uuid;
begin
  select * into v_quote from public.quotes
    where id = p_quote_id and requester_id = auth.uid() for update;
  if v_quote.id is null or v_quote.status <> 'sent' then raise exception 'QUOTE_NOT_ELIGIBLE'; end if;

  select * into v_request from public.requests where id = v_quote.request_id for update;
  if v_request.requester_id <> auth.uid() or v_request.status <> 'matched' then raise exception 'REQUEST_NOT_ELIGIBLE'; end if;

  select * into v_offer from public.request_offers where id = v_quote.offer_id for update;
  if v_offer.request_id <> v_quote.request_id or v_offer.provider_id <> v_quote.provider_id or v_offer.status <> 'accepted' then raise exception 'OFFER_NOT_ELIGIBLE'; end if;

  if exists (select 1 from public.engagements e where e.request_id = v_quote.request_id and e.status in ('proposed','agreed','in_progress','disputed')) then
    raise exception 'REQUEST_ALREADY_ENGAGED';
  end if;

  update public.quotes set status = 'accepted', updated_at = now() where id = p_quote_id returning * into v_quote;

  insert into public.engagements (
    request_id, offer_id, quote_id, requester_id, provider_id,
    agreed_amount, agreed_currency, agreed_scope, agreed_terms, status, agreed_at
  ) values (
    v_quote.request_id, v_quote.offer_id, v_offer.id, v_quote.requester_id, v_quote.provider_id,
    v_quote.amount, v_quote.currency, v_quote.scope, v_quote.terms, 'agreed', now()
  ) returning id into v_engagement_id;

  return v_quote;
end;
$$;

revoke all on function public.accept_quote(uuid) from public;
grant execute on function public.accept_quote(uuid) to authenticated;
