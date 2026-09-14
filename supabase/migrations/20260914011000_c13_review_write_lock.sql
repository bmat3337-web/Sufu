-- SUFU C.13: reviews are created exclusively through the transaction-bound RPC.
-- Public reads remain available; client INSERT/UPDATE/DELETE are removed.

drop policy if exists "reviews_completed_insert" on public.reviews;
drop policy if exists "reviews_insert" on public.reviews;
drop policy if exists "reviews_update_own" on public.reviews;
drop policy if exists "reviews_delete_own" on public.reviews;

create or replace function public.submit_review(p_engagement_id uuid, p_rating smallint, p_body text)
returns public.reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v public.engagements;
  r public.reviews;
  v_reviewee uuid;
  v_body text;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_rating < 1 or p_rating > 5 then raise exception 'INVALID_RATING'; end if;
  v_body := nullif(trim(coalesce(p_body,'')), '');
  if v_body is not null and char_length(v_body) > 2000 then raise exception 'REVIEW_BODY_TOO_LONG'; end if;

  select * into v from public.engagements
  where id=p_engagement_id and status='completed'
    and (requester_id=auth.uid() or provider_id=auth.uid())
  for update;
  if v.id is null then raise exception 'REVIEW_NOT_ELIGIBLE'; end if;

  if exists(select 1 from public.reviews where engagement_id=v.id and reviewer_id=auth.uid()) then
    raise exception 'REVIEW_ALREADY_EXISTS';
  end if;

  v_reviewee := case when auth.uid()=v.requester_id then v.provider_id else v.requester_id end;

  insert into public.reviews(engagement_id,reviewer_id,reviewee_id,provider_id,author_id,rating,body,text)
  values(v.id,auth.uid(),v_reviewee,v.provider_id,auth.uid(),p_rating,v_body,v_body)
  returning * into r;
  return r;
end;
$$;

revoke all on function public.submit_review(uuid,smallint,text) from public;
grant execute on function public.submit_review(uuid,smallint,text) to authenticated;

comment on function public.submit_review(uuid,smallint,text) is 'C.13 RPC-only transaction-bound review submission; max 2000 chars and one review per participant per engagement.';
