-- SUFU production fix: align get_or_create_conversation with the frontend contract.
-- The live RPC returns { id } so src/lib/api.ts can consume the response safely.
drop function if exists public.get_or_create_conversation(uuid, uuid);

create function public.get_or_create_conversation(p_listing_id uuid, p_other_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_a uuid;
  v_b uuid;
  v_id uuid;
begin
  if v_me is null then raise exception 'authentication required'; end if;
  if p_other_id is null or p_other_id = v_me then raise exception 'invalid conversation peer'; end if;
  if not exists (select 1 from public.profiles where id = p_other_id) then raise exception 'participant not found'; end if;

  v_a := least(v_me, p_other_id);
  v_b := greatest(v_me, p_other_id);

  select id into v_id
  from public.conversations
  where user_a = v_a and user_b = v_b and listing_id is not distinct from p_listing_id;

  if v_id is null then
    insert into public.conversations (user_a, user_b, listing_id)
    values (v_a, v_b, p_listing_id)
    on conflict (user_a, user_b, listing_id) do nothing
    returning id into v_id;

    if v_id is null then
      select id into v_id
      from public.conversations
      where user_a = v_a and user_b = v_b and listing_id is not distinct from p_listing_id;
    end if;
  end if;

  return jsonb_build_object('id', v_id);
end;
$$;

grant execute on function public.get_or_create_conversation(uuid, uuid) to authenticated;
revoke execute on function public.get_or_create_conversation(uuid, uuid) from anon;

-- Trigger-only functions must not be callable through the public REST RPC surface.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.touch_conversation() from public, anon, authenticated;
revoke execute on function public.recompute_provider_stats() from public, anon, authenticated;
