-- SUFU C.11: transaction-bound reputation.
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements(id) on delete restrict,
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  reviewee_id uuid not null references auth.users(id) on delete restrict,
  rating smallint not null check (rating between 1 and 5),
  body text check (body is null or char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint review_participants_distinct check (reviewer_id <> reviewee_id),
  unique (engagement_id, reviewer_id)
);
create index if not exists reviews_reviewee_idx on public.reviews(reviewee_id,created_at desc);
create index if not exists reviews_engagement_idx on public.reviews(engagement_id);
alter table public.reviews enable row level security;
create policy "reviews_public_read" on public.reviews for select using (true);
create policy "reviews_completed_insert" on public.reviews for insert with check (
  reviewer_id=auth.uid() and exists (
    select 1 from public.engagements e where e.id=reviews.engagement_id and e.status='completed' and (e.requester_id=auth.uid() and e.provider_id=reviews.reviewee_id or e.provider_id=auth.uid() and e.requester_id=reviews.reviewee_id)
  )
);
create or replace function public.submit_review(p_engagement_id uuid,p_rating smallint,p_body text)
returns public.reviews language plpgsql security definer set search_path=public as $$
declare v public.engagements; r public.reviews; v_reviewee uuid;
begin
 select * into v from public.engagements where id=p_engagement_id and status='completed' and (requester_id=auth.uid() or provider_id=auth.uid()) for update;
 if v.id is null then raise exception 'REVIEW_NOT_ELIGIBLE'; end if;
 if exists(select 1 from public.reviews where engagement_id=v.id and reviewer_id=auth.uid()) then raise exception 'REVIEW_ALREADY_EXISTS'; end if;
 v_reviewee := case when auth.uid()=v.requester_id then v.provider_id else v.requester_id end;
 insert into public.reviews(engagement_id,reviewer_id,reviewee_id,rating,body) values(v.id,auth.uid(),v_reviewee,p_rating,nullif(trim(p_body),'')) returning * into r;
 return r;
end; $$;
revoke all on function public.submit_review(uuid,smallint,text) from public;
grant execute on function public.submit_review(uuid,smallint,text) to authenticated;
