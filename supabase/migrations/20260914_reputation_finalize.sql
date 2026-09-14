-- SUFU C.12: canonical reputation aggregation for both legacy and transaction reviews.
-- Historical reviews retain provider_id/author_id. New reviews additionally carry
-- engagement_id/reviewer_id/reviewee_id and are created through submit_review().

create or replace function public.refresh_provider_rating(p_provider_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  update public.profiles p
  set rating = coalesce((select round(avg(r.rating)::numeric,1) from public.reviews r where r.provider_id=p_provider_id),0),
      review_count = (select count(*) from public.reviews r where r.provider_id=p_provider_id)
  where p.id=p_provider_id;
end; $$;

create or replace function public.reviews_refresh_rating()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_op='DELETE' then perform public.refresh_provider_rating(old.provider_id);
  elsif tg_op='UPDATE' then perform public.refresh_provider_rating(old.provider_id); perform public.refresh_provider_rating(new.provider_id);
  else perform public.refresh_provider_rating(new.provider_id);
  end if;
  return coalesce(new,old);
end; $$;

drop trigger if exists reviews_refresh_rating_trigger on public.reviews;
create trigger reviews_refresh_rating_trigger after insert or update or delete on public.reviews
for each row execute function public.reviews_refresh_rating();

revoke all on function public.refresh_provider_rating(uuid) from public,anon,authenticated;
revoke all on function public.reviews_refresh_rating() from public,anon,authenticated;

-- Prevent direct writes to server-derived aggregate columns.
revoke update (rating,review_count,completed_jobs) on public.profiles from anon,authenticated;
