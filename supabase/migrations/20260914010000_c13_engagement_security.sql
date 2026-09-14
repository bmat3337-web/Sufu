-- SUFU C.13: engagement lifecycle security hardening.
-- Provider starts work; requester confirms completion; final states are immutable.

create or replace function public.update_engagement_status(p_engagement_id uuid, p_status text)
returns public.engagements
language plpgsql
security definer
set search_path = public
as $$
declare v public.engagements;
begin
  select * into v from public.engagements
  where id = p_engagement_id
    and (requester_id = auth.uid() or provider_id = auth.uid())
  for update;

  if v.id is null then raise exception 'ENGAGEMENT_NOT_FOUND'; end if;
  if p_status not in ('in_progress','completed','cancelled','disputed') then raise exception 'INVALID_ENGAGEMENT_STATUS'; end if;
  if v.status in ('completed','cancelled','disputed') then raise exception 'ENGAGEMENT_FINAL'; end if;

  if v.status = 'agreed' then
    if p_status not in ('in_progress','cancelled','disputed') then raise exception 'INVALID_STATUS_TRANSITION'; end if;
    if p_status = 'in_progress' and auth.uid() <> v.provider_id then raise exception 'START_REQUIRES_PROVIDER'; end if;
  elsif v.status = 'in_progress' then
    if p_status not in ('completed','cancelled','disputed') then raise exception 'INVALID_STATUS_TRANSITION'; end if;
    if p_status = 'completed' and auth.uid() <> v.requester_id then raise exception 'COMPLETION_REQUIRES_REQUESTER'; end if;
  else
    raise exception 'INVALID_STATUS_TRANSITION';
  end if;

  update public.engagements
  set status = p_status,
      started_at = case when p_status='in_progress' and started_at is null then now() else started_at end,
      completed_at = case when p_status='completed' then now() else completed_at end,
      cancelled_at = case when p_status='cancelled' then now() else cancelled_at end,
      updated_at = now()
  where id = v.id
  returning * into v;
  return v;
end;
$$;

revoke all on function public.update_engagement_status(uuid,text) from public;
grant execute on function public.update_engagement_status(uuid,text) to authenticated;

comment on function public.update_engagement_status(uuid,text) is 'C.13 server-authoritative lifecycle: provider starts, requester completes, participants may cancel/dispute before final state.';
