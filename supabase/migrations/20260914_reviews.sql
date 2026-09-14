-- SUFU C.11: transaction-bound reputation.
-- The legacy reviews table is normalized by 20260913050000_reviews_compat.sql.

alter table public.reviews drop constraint if exists review_participants_distinct;
alter table public.reviews add constraint review_participants_distinct check (reviewer_id <> reviewee_id);
create index if not exists reviews_reviewee_idx on public.reviews(reviewee_id,created_at desc);
create index if not exists reviews_engagement_idx on public.reviews(engagement_id);

alter table public.reviews enable row level security;
drop policy if exists "reviews_public_read" on public.reviews;
create policy "reviews_public_read" on public.reviews for select using (true);
drop policy if exists "reviews_completed_insert" on public.reviews;
create policy "reviews_completed_insert" on public.reviews for insert with check (
  reviewer_id=auth.uid() and engagement_id is not null and exists (
    select 1 from public.engagements e where e.id=reviews.engagement_id and e.status='completed'
      and ((e.requester_id=auth.uid() and e.provider_id=reviews.reviewee_id) or (e.provider_id=auth.uid() and e.requester_id=reviews.reviewee_id))
  )
);

create or replace function public.submit_review(p_engagement_id uuid,p_rating smallint,p_body text)
returns public.reviews language plpgsql security definer set search_path=public as $$
declare v public.engagements; r public.reviews; v_reviewee uuid;
begin
  if p_rating < 1 or p_rating > 5 then raise exception 'INVALID_RATING'; end if;
  select * into v from public.engagements where id=p_engagement_id and status='completed'
    and (requester_id=auth.uid() or provider_id=auth.uid()) for update;
  if v.id is null then raise exception 'REVIEW_NOT_ELIGIBLE'; end if;
  if exists(select 1 from public.reviews where engagement_id=v.id and reviewer_id=auth.uid()) then raise exception 'REVIEW_ALREADY_EXISTS'; end if;
  v_reviewee := case when auth.uid()=v.requester_id then v.provider_id else v.requester_id end;
  insert into public.reviews(engagement_id,reviewer_id,reviewee_id,provider_id,author_id,rating,body,text)
  values(v.id,auth.uid(),v_reviewee,v.provider_id,auth.uid(),p_rating,nullif(trim(p_body),''),nullif(trim(p_body),'')) returning * into r;
  return r;
end; $$;
revoke all on function public.submit_review(uuid,smallint,text) from public;
grant execute on function public.submit_review(uuid,smallint,text) to authenticated;
