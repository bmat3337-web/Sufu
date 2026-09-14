-- SUFU C.8/C.9: structured quotes and server-authoritative engagement lifecycle.
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(), request_id uuid not null references public.requests(id) on delete cascade, offer_id uuid not null references public.request_offers(id) on delete restrict,
  requester_id uuid not null references auth.users(id) on delete cascade, provider_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 160), scope text not null check (char_length(trim(scope)) between 3 and 5000), amount numeric(14,2) not null check (amount >= 0), currency text not null check (currency ~ '^[A-Z]{3}$'), start_date date, due_date date, terms text,
  status text not null default 'draft' check (status in ('draft','sent','accepted','declined','cancelled','expired','completed')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), accepted_at timestamptz,
  constraint quote_dates_valid check (due_date is null or start_date is null or due_date >= start_date), constraint quote_participants_distinct check (requester_id <> provider_id), unique (offer_id)
);
create index if not exists quotes_request_idx on public.quotes (request_id, created_at desc); create index if not exists quotes_requester_idx on public.quotes (requester_id, status, created_at desc); create index if not exists quotes_provider_idx on public.quotes (provider_id, status, created_at desc);
alter table public.quotes enable row level security;
drop policy if exists "quotes_participant_read" on public.quotes;
create policy "quotes_participant_read" on public.quotes for select using (requester_id = auth.uid() or provider_id = auth.uid());
drop policy if exists "quotes_provider_insert" on public.quotes;
create policy "quotes_provider_insert" on public.quotes for insert with check (provider_id = auth.uid() and exists (select 1 from public.request_offers o where o.id=quotes.offer_id and o.request_id=quotes.request_id and o.provider_id=auth.uid() and o.status='accepted') and exists (select 1 from public.requests r where r.id=quotes.request_id and r.requester_id=quotes.requester_id and r.status='matched'));
drop policy if exists "quotes_participant_update" on public.quotes;

create table if not exists public.engagements (
  id uuid primary key default gen_random_uuid(), request_id uuid not null references public.requests(id) on delete restrict, offer_id uuid not null references public.request_offers(id) on delete restrict, quote_id uuid not null unique references public.quotes(id) on delete restrict,
  requester_id uuid not null references auth.users(id) on delete restrict, provider_id uuid not null references auth.users(id) on delete restrict, agreed_amount numeric(14,2) not null check (agreed_amount >= 0), agreed_currency text not null check (agreed_currency ~ '^[A-Z]{3}$'), agreed_title text not null, agreed_scope text not null, agreed_terms text,
  status text not null default 'agreed' check (status in ('agreed','in_progress','completed','cancelled','disputed')), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), started_at timestamptz, completed_at timestamptz, cancelled_at timestamptz, unique (request_id)
);
create index if not exists engagements_requester_idx on public.engagements (requester_id,status,created_at desc); create index if not exists engagements_provider_idx on public.engagements (provider_id,status,created_at desc);
alter table public.engagements enable row level security;
drop policy if exists "engagement_participant_read" on public.engagements;
create policy "engagement_participant_read" on public.engagements for select using (requester_id=auth.uid() or provider_id=auth.uid());

create or replace function public.accept_quote(p_quote_id uuid) returns public.engagements language plpgsql security definer set search_path=public as $$
declare v_quote public.quotes; v_engagement public.engagements;
begin
 select * into v_quote from public.quotes where id=p_quote_id and requester_id=auth.uid() and status='sent' for update;
 if v_quote.id is null then raise exception 'QUOTE_NOT_ELIGIBLE'; end if;
 if exists(select 1 from public.engagements where request_id=v_quote.request_id) then raise exception 'REQUEST_ALREADY_ENGAGED'; end if;
 update public.quotes set status='accepted',accepted_at=now(),updated_at=now() where id=v_quote.id returning * into v_quote;
 insert into public.engagements(request_id,offer_id,quote_id,requester_id,provider_id,agreed_amount,agreed_currency,agreed_title,agreed_scope,agreed_terms,status) values(v_quote.request_id,v_quote.offer_id,v_quote.id,v_quote.requester_id,v_quote.provider_id,v_quote.amount,v_quote.currency,v_quote.title,v_quote.scope,v_quote.terms,'agreed') returning * into v_engagement;
 return v_engagement;
end; $$;

create or replace function public.update_engagement_status(p_engagement_id uuid,p_status text) returns public.engagements language plpgsql security definer set search_path=public as $$
declare v public.engagements;
begin
 select * into v from public.engagements where id=p_engagement_id and (requester_id=auth.uid() or provider_id=auth.uid()) for update;
 if v.id is null then raise exception 'ENGAGEMENT_NOT_FOUND'; end if;
 if p_status not in ('in_progress','completed','cancelled','disputed') then raise exception 'INVALID_ENGAGEMENT_STATUS'; end if;
 if v.status='agreed' and p_status not in ('in_progress','cancelled','disputed') then raise exception 'INVALID_STATUS_TRANSITION'; end if;
 if v.status='in_progress' and p_status not in ('completed','cancelled','disputed') then raise exception 'INVALID_STATUS_TRANSITION'; end if;
 if v.status in ('completed','cancelled','disputed') then raise exception 'ENGAGEMENT_FINAL'; end if;
 if p_status='completed' and auth.uid()<>v.requester_id then raise exception 'COMPLETION_REQUIRES_REQUESTER'; end if;
 update public.engagements set status=p_status,started_at=case when p_status='in_progress' and started_at is null then now() else started_at end,completed_at=case when p_status='completed' then now() else completed_at end,cancelled_at=case when p_status='cancelled' then now() else cancelled_at end,updated_at=now() where id=v.id returning * into v;
 return v;
end; $$;
revoke all on function public.accept_quote(uuid) from public; grant execute on function public.accept_quote(uuid) to authenticated;
revoke all on function public.update_engagement_status(uuid,text) from public; grant execute on function public.update_engagement_status(uuid,text) to authenticated;
