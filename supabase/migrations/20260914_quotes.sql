-- SUFU C.8: structured quotes / job agreements.
-- Commercial intent is recorded without taking payment. Payment/escrow can attach later.
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  offer_id uuid not null references public.request_offers(id) on delete restrict,
  requester_id uuid not null references auth.users(id) on delete cascade,
  provider_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 160),
  scope text not null check (char_length(trim(scope)) between 3 and 5000),
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  start_date date,
  due_date date,
  terms text,
  status text not null default 'draft' check (status in ('draft','sent','accepted','declined','cancelled','expired','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quote_dates_valid check (due_date is null or start_date is null or due_date >= start_date),
  constraint quote_participants_distinct check (requester_id <> provider_id),
  unique (offer_id)
);

create index if not exists quotes_request_idx on public.quotes (request_id, created_at desc);
create index if not exists quotes_requester_idx on public.quotes (requester_id, status, created_at desc);
create index if not exists quotes_provider_idx on public.quotes (provider_id, status, created_at desc);

alter table public.quotes enable row level security;

create policy "quotes_participant_read" on public.quotes
  for select using (requester_id = auth.uid() or provider_id = auth.uid());

create policy "quotes_provider_insert" on public.quotes
  for insert with check (
    provider_id = auth.uid()
    and exists (
      select 1 from public.request_offers o
      where o.id = quotes.offer_id
        and o.request_id = quotes.request_id
        and o.provider_id = auth.uid()
        and o.status = 'accepted'
    )
    and exists (
      select 1 from public.requests r
      where r.id = quotes.request_id
        and r.requester_id = quotes.requester_id
        and r.status = 'matched'
    )
  );

-- Participants may only make forward-safe status changes; acceptance remains
-- restricted to the requester and the accepted quote itself.
create policy "quotes_participant_update" on public.quotes
  for update using (requester_id = auth.uid() or provider_id = auth.uid())
  with check (requester_id = auth.uid() or provider_id = auth.uid());

create or replace function public.accept_quote(p_quote_id uuid)
returns public.quotes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote public.quotes;
begin
  select q.* into v_quote
  from public.quotes q
  where q.id = p_quote_id
    and q.requester_id = auth.uid()
    and q.status = 'sent'
  for update;

  if v_quote.id is null then raise exception 'QUOTE_NOT_ELIGIBLE'; end if;

  update public.quotes
    set status = 'accepted', updated_at = now()
    where id = p_quote_id
    returning * into v_quote;

  return v_quote;
end;
$$;

revoke all on function public.accept_quote(uuid) from public;
grant execute on function public.accept_quote(uuid) to authenticated;
